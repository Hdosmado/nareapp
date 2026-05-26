import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLog } from './entities/audit-log.entity';

/** ABM de entradas de auditoría desde el panel. */
@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logs: Repository<AuditLog>,
  ) {}

  /** Registra una entrada de auditoría. */
  create(dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.logs.save(this.logs.create(dto));
  }

  findAll(pagination: PaginationDto): Promise<AuditLog[]> {
    const { page, limit } = pagination;
    return this.logs.find({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.logs.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Entrada de auditoría no encontrada');
    }
    return log;
  }

  /** Actualiza una entrada de auditoría. */
  async update(id: string, dto: UpdateAuditLogDto): Promise<AuditLog> {
    const log = await this.logs.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Entrada de auditoría no encontrada');
    }
    this.logs.merge(log, dto);
    return this.logs.save(log);
  }

  /** Elimina físicamente una entrada de auditoría. */
  async remove(id: string): Promise<void> {
    const log = await this.logs.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Entrada de auditoría no encontrada');
    }
    await this.logs.delete(id);
  }
}
