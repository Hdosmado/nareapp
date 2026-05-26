import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { UpdateAttendanceEventDto } from './dto/update-attendance-event.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';

/**
 * ABM de eventos de asistencia desde el panel de coordinación.
 * Separado de AttendanceService (app mobile) para no afectar el flujo de la app.
 */
@Injectable()
export class AttendanceEventsAdminService {
  constructor(
    @InjectRepository(AttendanceEvent)
    private readonly events: Repository<AttendanceEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
  ) {}

  /** Crea un evento de asistencia asociado a una asignación de servicio. */
  async create(dto: CreateAttendanceEventDto): Promise<AttendanceEvent> {
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
      distanceToAddress: dto.distanceToAddress,
      insideAllowedRadius: dto.insideAllowedRadius,
      exceptionReason: dto.exceptionReason,
      timestampLocal: dto.timestampLocal
        ? new Date(dto.timestampLocal)
        : undefined,
      timestampServer: dto.timestampServer
        ? new Date(dto.timestampServer)
        : new Date(),
    });
    await this.events.save(event);
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

  /** Actualiza un evento de asistencia. */
  async update(
    id: string,
    dto: UpdateAttendanceEventDto,
  ): Promise<AttendanceEvent> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evento de asistencia no encontrado');
    }
    this.events.merge(event, {
      type: dto.type,
      idempotencyKey: dto.idempotencyKey,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      distanceToAddress: dto.distanceToAddress,
      insideAllowedRadius: dto.insideAllowedRadius,
      exceptionReason: dto.exceptionReason,
      timestampLocal: dto.timestampLocal
        ? new Date(dto.timestampLocal)
        : undefined,
      timestampServer: dto.timestampServer
        ? new Date(dto.timestampServer)
        : undefined,
    });
    await this.events.save(event);
    return this.findOne(id);
  }

  /** Elimina físicamente un evento de asistencia. */
  async remove(id: string): Promise<void> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evento de asistencia no encontrado');
    }
    await this.events.delete(id);
  }
}
