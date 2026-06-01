import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CreateLocationEventDto } from './dto/create-location-event.dto';
import { PreServiceLocationEvent } from './entities/pre-service-location-event.entity';

/** Opciones del alta manual de un punto de tracking. */
export interface CreateLocationEventOptions {
  /** Usuario de coordinación que registra la corrección manual. */
  creadoManualmentePorUsuarioId?: string;
}

/**
 * Endpoints admin de puntos de tracking previos al servicio (panel de
 * coordinación). Separado de TrackingService (app mobile) para no afectar el
 * flujo de la app.
 *
 * El servidor es la autoridad anti-fraude: este servicio es APPEND-ONLY (sin
 * update/remove) y, al crear, NUNCA confía en los campos anti-fraude del body
 * (insideGeofence, timestampServer). El alta solo representa una corrección/
 * excepción MANUAL: se marca `origin = 'manual'` para que el motor de riesgo no
 * la trate como prueba GPS de presencia.
 */
@Injectable()
export class LocationEventsAdminService {
  /** Origen que distingue un punto cargado a mano por coordinación. */
  private static readonly ORIGEN_MANUAL = 'manual';

  constructor(
    @InjectRepository(PreServiceLocationEvent)
    private readonly events: Repository<PreServiceLocationEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registra un punto de tracking como corrección/excepción MANUAL asociada a
   * una asignación. Los campos anti-fraude NO se aceptan del body: el server
   * fija `timestampServer` (ahora) y deja `insideGeofence` nulo (sin prueba GPS
   * de presencia). Se fuerza `origin = 'manual'`.
   */
  async create(
    dto: CreateLocationEventDto,
    options: CreateLocationEventOptions = {},
  ): Promise<PreServiceLocationEvent> {
    const assignment = await this.assignments.findOne({
      where: { id: dto.assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación de servicio no encontrada');
    }
    const event = this.events.create({
      assignment,
      latitude: dto.latitude,
      longitude: dto.longitude,
      idempotencyKey: dto.idempotencyKey,
      accuracy: dto.accuracy,
      batteryLevel: dto.batteryLevel,
      connectivityStatus: dto.connectivityStatus,
      // Origen manual: el motor no debe tratar este punto como prueba GPS,
      // independientemente de lo que mande el body.
      origin: LocationEventsAdminService.ORIGEN_MANUAL,
      // Campo anti-fraude: lo calcula el server a partir del domicilio, nunca
      // se acepta del body. En alta manual queda sin geocerca evaluada.
      insideGeofence: null,
      timestampLocal: dto.timestampLocal
        ? new Date(dto.timestampLocal)
        : undefined,
      // El server fija el timestamp autoritativo: nunca lo decide el cliente.
      timestampServer: new Date(),
    });
    await this.events.save(event);
    // Traza de la corrección manual con el coordinador que la creó.
    await this.audit.record({
      actorType: 'user',
      actorId: options.creadoManualmentePorUsuarioId,
      entity: 'pre_service_location_event',
      entityId: event.id,
      action: 'create_manual',
      diff: {
        assignmentId: dto.assignmentId,
        origen: LocationEventsAdminService.ORIGEN_MANUAL,
        creadoManualmentePorUsuarioId: options.creadoManualmentePorUsuarioId,
      },
    });
    return this.findOne(event.id);
  }

  findAll(pagination: PaginationDto): Promise<PreServiceLocationEvent[]> {
    const { page, limit } = pagination;
    return this.events.find({
      relations: { assignment: true, provider: true, device: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<PreServiceLocationEvent> {
    const event = await this.events.findOne({
      where: { id },
      relations: { assignment: true, provider: true, device: true },
    });
    if (!event) {
      throw new NotFoundException('Punto de tracking no encontrado');
    }
    return event;
  }
}
