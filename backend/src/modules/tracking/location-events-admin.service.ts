import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CreateLocationEventDto } from './dto/create-location-event.dto';
import { UpdateLocationEventDto } from './dto/update-location-event.dto';
import { PreServiceLocationEvent } from './entities/pre-service-location-event.entity';

/**
 * ABM de puntos de tracking previos al servicio desde el panel de coordinación.
 * Separado de TrackingService (app mobile) para no afectar el flujo de la app.
 */
@Injectable()
export class LocationEventsAdminService {
  constructor(
    @InjectRepository(PreServiceLocationEvent)
    private readonly events: Repository<PreServiceLocationEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
  ) {}

  /** Crea un punto de tracking asociado a una asignación de servicio. */
  async create(
    dto: CreateLocationEventDto,
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
      origin: dto.origin,
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

  /** Actualiza un punto de tracking. */
  async update(
    id: string,
    dto: UpdateLocationEventDto,
  ): Promise<PreServiceLocationEvent> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Punto de tracking no encontrado');
    }
    this.events.merge(event, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      idempotencyKey: dto.idempotencyKey,
      accuracy: dto.accuracy,
      batteryLevel: dto.batteryLevel,
      connectivityStatus: dto.connectivityStatus,
      origin: dto.origin,
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

  /** Elimina físicamente un punto de tracking. */
  async remove(id: string): Promise<void> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Punto de tracking no encontrado');
    }
    await this.events.delete(id);
  }
}
