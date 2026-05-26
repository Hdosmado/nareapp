import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateNotificationLogDto } from './dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from './dto/update-notification-log.dto';
import { NotificationLog } from './entities/notification-log.entity';

/** ABM de logs de notificación desde el panel. */
@Injectable()
export class NotificationLogsAdminService {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logs: Repository<NotificationLog>,
  ) {}

  /** Registra un log de notificación. */
  create(dto: CreateNotificationLogDto): Promise<NotificationLog> {
    return this.logs.save(
      this.logs.create({
        type: dto.type,
        channel: dto.channel,
        status: dto.status,
        payload: dto.payload,
        sentAt: dto.sentAt ? new Date(dto.sentAt) : undefined,
        // El provider/assignment sólo se asocian si vienen los ids.
        ...(dto.providerId ? { provider: { id: dto.providerId } } : {}),
        ...(dto.assignmentId ? { assignment: { id: dto.assignmentId } } : {}),
      }),
    );
  }

  findAll(pagination: PaginationDto): Promise<NotificationLog[]> {
    const { page, limit } = pagination;
    return this.logs.find({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<NotificationLog> {
    const log = await this.logs.findOne({
      where: { id },
      relations: { provider: true, assignment: true },
    });
    if (!log) {
      throw new NotFoundException('Log de notificación no encontrado');
    }
    return log;
  }

  /** Actualiza un log de notificación. */
  async update(
    id: string,
    dto: UpdateNotificationLogDto,
  ): Promise<NotificationLog> {
    const log = await this.logs.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Log de notificación no encontrado');
    }
    this.logs.merge(log, {
      type: dto.type,
      channel: dto.channel,
      status: dto.status,
      payload: dto.payload,
      ...(dto.sentAt ? { sentAt: new Date(dto.sentAt) } : {}),
      ...(dto.providerId ? { provider: { id: dto.providerId } } : {}),
      ...(dto.assignmentId ? { assignment: { id: dto.assignmentId } } : {}),
    });
    await this.logs.save(log);
    return this.findOne(id);
  }

  /** Elimina físicamente un log de notificación. */
  async remove(id: string): Promise<void> {
    const log = await this.logs.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Log de notificación no encontrado');
    }
    await this.logs.delete(id);
  }
}
