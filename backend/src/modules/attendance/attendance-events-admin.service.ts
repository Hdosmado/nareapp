import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';

/** Opciones del alta manual de un evento de asistencia. */
export interface CreateAttendanceEventOptions {
  /** Usuario de coordinación que registra la corrección manual. */
  creadoManualmentePorUsuarioId?: string;
}

/**
 * Endpoints admin de eventos de asistencia (panel de coordinación). Separado de
 * AttendanceService (app mobile) para no afectar el flujo de la app.
 *
 * El servidor es la autoridad anti-fraude: este servicio es APPEND-ONLY (sin
 * update/remove) y, al crear, NUNCA confía en los campos anti-fraude del body
 * (insideAllowedRadius, distanceToAddress, timestampServer). Esos los fija el
 * servidor; el alta solo representa una corrección/excepción MANUAL que el
 * motor de riesgo no debe tratar como prueba GPS.
 */
@Injectable()
export class AttendanceEventsAdminService {
  constructor(
    @InjectRepository(AttendanceEvent)
    private readonly events: Repository<AttendanceEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registra un evento de asistencia como corrección/excepción MANUAL asociada
   * a una asignación. Los campos anti-fraude NO se aceptan del body: el server
   * fija `timestampServer` (ahora) y no marca `insideAllowedRadius`/
   * `distanceToAddress` (quedan nulos: sin prueba GPS de presencia).
   */
  async create(
    dto: CreateAttendanceEventDto,
    options: CreateAttendanceEventOptions = {},
  ): Promise<AttendanceEvent> {
    const assignment = await this.assignments.findOne({
      where: { id: dto.assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación de servicio no encontrada');
    }
    const event = this.events.create({
      assignment,
      type: dto.type,
      idempotencyKey: dto.idempotencyKey,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      // Campos anti-fraude: NO se toman del body. El alta manual no es prueba
      // GPS de presencia, así que el server no marca radio ni distancia.
      distanceToAddress: undefined,
      insideAllowedRadius: undefined,
      exceptionReason: dto.exceptionReason,
      earlyCheckoutReason: dto.earlyCheckoutReason ?? null,
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
      entity: 'attendance_event',
      entityId: event.id,
      action: 'create_manual',
      diff: {
        assignmentId: dto.assignmentId,
        type: dto.type,
        origen: 'manual',
        creadoManualmentePorUsuarioId: options.creadoManualmentePorUsuarioId,
      },
    });
    return this.findOne(event.id);
  }

  findAll(pagination: PaginationDto): Promise<AttendanceEvent[]> {
    const { page, limit } = pagination;
    return this.events.find({
      relations: { assignment: true, provider: true, device: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<AttendanceEvent> {
    const event = await this.events.findOne({
      where: { id },
      relations: { assignment: true, provider: true, device: true },
    });
    if (!event) {
      throw new NotFoundException('Evento de asistencia no encontrado');
    }
    return event;
  }
}
