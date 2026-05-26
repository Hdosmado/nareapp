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

@Injectable()
export class CoordinationService {
  constructor(
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(CoordinationAction)
    private readonly actions: Repository<CoordinationAction>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
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
    });
    const provider = await this.providers.findOne({
      where: { id: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador de reemplazo no encontrado');
    }

    original.status = AssignmentStatus.CANCELADO;
    original.replacementRequired = false;
    await this.assignments.save(original);

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
