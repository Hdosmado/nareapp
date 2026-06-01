import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Consulta del log de auditoría desde el panel. Solo lectura: el log es
 * append-only desde el dominio y la única vía de escritura es
 * `AuditService.record()` (interno), nunca por API.
 */
@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logs: Repository<AuditLog>,
  ) {}

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
}
