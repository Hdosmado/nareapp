import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsRelations, Repository } from 'typeorm';
import {
  AssignmentStatus,
  CoordinationActionType,
  RiskLevel,
} from '../../common/enums';
import { argentinaDayRangeUtc } from '../../common/timezone.util';
import { NotificationsService } from '../notifications/notifications.service';
import { Provider } from '../providers/entities/provider.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import { AssignReplacementDto } from './dto/assign-replacement.dto';
import { CoordinationActionDto } from './dto/coordination-action.dto';
import { CoordinationAction } from './entities/coordination-action.entity';

/** Resumen del tablero operativo del día. */
export interface DashboardSummary {
  totalHoy: number;
  proximos: number;
  enRiesgo: number;
  demorados: number;
  ausenciaProbable: number;
  requierenReemplazo: number;
  enServicio: number;
  finalizados: number;
}

/** Punto geográfico del domicilio donde se presta el servicio. */
interface AddressPoint {
  latitude: number;
  longitude: number;
  calle: string;
  ciudad: string;
  provincia: string;
}

/** Última ubicación reportada por el prestador en la ventana pre-servicio. */
interface LastLocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  batteryLevel: number | null;
  connectivityStatus: string;
  timestampServer: Date;
}

/** Resultado del mapa operativo de un servicio asignado. */
export interface LastLocationResult {
  assignmentId: string;
  address: AddressPoint | null;
  lastLocation: LastLocationPoint | null;
  distanceMeters: number | null;
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusM = 6_371_000;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class CoordinationService {
  constructor(
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(CoordinationAction)
    private readonly actions: Repository<CoordinationAction>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(PreServiceLocationEvent)
    private readonly locationEvents: Repository<PreServiceLocationEvent>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Contadores del tablero operativo para el día de hoy. */
  async getDashboard(): Promise<DashboardSummary> {
    const { start, end } = argentinaDayRangeUtc();
    const todays = await this.assignments.find({
      where: { startTime: Between(start, end) },
    });
    const count = (predicate: (a: ServiceAssignment) => boolean): number =>
      todays.filter(predicate).length;
    const enRiesgoLevels = [
      RiskLevel.AMARILLO,
      RiskLevel.NARANJA,
      RiskLevel.ROJO,
    ];
    return {
      totalHoy: todays.length,
      proximos: count((a) => a.status === AssignmentStatus.PROXIMO),
      enRiesgo: count((a) => enRiesgoLevels.includes(a.riskLevel)),
      demorados: count((a) => a.status === AssignmentStatus.DEMORADO),
      ausenciaProbable: count(
        (a) => a.status === AssignmentStatus.AUSENTE_PROBABLE,
      ),
      requierenReemplazo: count((a) => a.replacementRequired),
      enServicio: count((a) => a.status === AssignmentStatus.EN_SERVICIO),
      finalizados: count((a) => a.status === AssignmentStatus.FINALIZADO),
    };
  }

  /**
   * Coordinación solicita al prestador que finalice el servicio: registra la
   * acción y dispara la notificación push correspondiente (no cambia el
   * estado del servicio — el cierre operativo lo hace el prestador desde la
   * app con el check-out).
   */
  async requestEndOfService(
    assignmentId: string,
    coordinatorId: string,
    dto: CoordinationActionDto,
  ): Promise<CoordinationAction> {
    const assignment = await this.loadAssignment(assignmentId, {
      provider: true,
    });
    const action = await this.recordAction(
      assignmentId,
      coordinatorId,
      CoordinationActionType.ENVIAR_NOTIFICACION,
      dto.notes ?? 'Solicitud de fin de servicio',
    );
    if (assignment.provider) {
      await this.notifications.notifyProvider(
        assignment.provider.id,
        'solicitud_fin_servicio',
        { assignmentId, notes: dto.notes ?? null },
        assignmentId,
      );
    }
    return action;
  }

  /** Registra que coordinación contactó al prestador. */
  markContacted(
    assignmentId: string,
    coordinatorId: string,
    dto: CoordinationActionDto,
  ): Promise<CoordinationAction> {
    return this.recordAction(
      assignmentId,
      coordinatorId,
      CoordinationActionType.MARCAR_CONTACTADO,
      dto.notes,
    );
  }

  /** Marca que el servicio requiere reemplazo. */
  async requireReplacement(
    assignmentId: string,
    coordinatorId: string,
    dto: CoordinationActionDto,
  ): Promise<CoordinationAction> {
    const assignment = await this.loadAssignment(assignmentId);
    assignment.replacementRequired = true;
    await this.assignments.save(assignment);
    return this.recordAction(
      assignmentId,
      coordinatorId,
      CoordinationActionType.MARCAR_REEMPLAZO_REQUERIDO,
      dto.notes,
    );
  }

  /** Asigna un prestador de reemplazo, conservando la traza del original. */
  async assignReplacement(
    assignmentId: string,
    coordinatorId: string,
    dto: AssignReplacementDto,
  ): Promise<ServiceAssignment> {
    const original = await this.loadAssignment(assignmentId, {
      service: true,
      patient: true,
      address: true,
      provider: true,
    });
    const provider = await this.providers.findOne({
      where: { id: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador de reemplazo no encontrado');
    }

    const originalProviderId = original.provider?.id ?? null;

    original.status = AssignmentStatus.CANCELADO;
    original.replacementRequired = false;
    await this.assignments.save(original);

    // Avisar al prestador original que su asignación fue cancelada por reemplazo.
    if (originalProviderId && originalProviderId !== provider.id) {
      await this.notifications.notifyProvider(
        originalProviderId,
        'asignacion_cancelada',
        { assignmentId: original.id, motivo: 'reemplazo' },
        original.id,
      );
    }

    const replacement = await this.assignments.save(
      this.assignments.create({
        service: original.service,
        provider,
        patient: original.patient,
        address: original.address,
        startTime: original.startTime,
        endTime: original.endTime,
        city: original.city,
        province: original.province,
        status: AssignmentStatus.PENDIENTE,
        riskLevel: RiskLevel.VERDE,
        originalAssignment: original,
      }),
    );

    await this.recordAction(
      assignmentId,
      coordinatorId,
      CoordinationActionType.ASIGNAR_REEMPLAZO,
      `Reemplazo asignado: ${provider.apellido}, ${provider.nombre}`,
    );
    await this.notifications.notifyProvider(
      provider.id,
      'cambio_asignacion',
      {
        assignmentId: replacement.id,
        originalAssignmentId: assignmentId,
      },
      replacement.id,
    );
    return replacement;
  }

  /**
   * Mapa operativo: domicilio del servicio y última ubicación conocida del
   * prestador en la ventana de tracking previa, con la distancia entre ambos.
   */
  async getLastLocation(assignmentId: string): Promise<LastLocationResult> {
    const assignment = await this.loadAssignment(assignmentId, {
      address: true,
    });
    const address = assignment.address;
    const event = await this.locationEvents.findOne({
      where: { assignment: { id: assignmentId } },
      order: { timestampServer: 'DESC' },
    });

    const addressPoint: AddressPoint | null =
      address && address.latitude != null && address.longitude != null
        ? {
            latitude: address.latitude,
            longitude: address.longitude,
            calle: address.calle,
            ciudad: address.ciudad,
            provincia: address.provincia,
          }
        : null;

    const lastLocation: LastLocationPoint | null = event
      ? {
          latitude: event.latitude,
          longitude: event.longitude,
          accuracy: event.accuracy ?? null,
          batteryLevel: event.batteryLevel ?? null,
          connectivityStatus: event.connectivityStatus,
          timestampServer: event.timestampServer,
        }
      : null;

    const distanceMeters =
      addressPoint && lastLocation
        ? Math.round(
            haversineMeters(
              addressPoint.latitude,
              addressPoint.longitude,
              lastLocation.latitude,
              lastLocation.longitude,
            ),
          )
        : null;

    return { assignmentId, address: addressPoint, lastLocation, distanceMeters };
  }

  private async loadAssignment(
    id: string,
    relations?: FindOptionsRelations<ServiceAssignment>,
  ): Promise<ServiceAssignment> {
    const assignment = await this.assignments.findOne({
      where: { id },
      relations,
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    return assignment;
  }

  private recordAction(
    assignmentId: string,
    coordinatorId: string,
    actionType: CoordinationActionType,
    notes?: string,
  ): Promise<CoordinationAction> {
    return this.actions.save(
      this.actions.create({
        assignment: { id: assignmentId },
        coordinator: { id: coordinatorId },
        actionType,
        notes,
      }),
    );
  }
}
