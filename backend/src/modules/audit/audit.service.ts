import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

/** Datos de una entrada de auditoría. */
export interface AuditEntry {
  actorType: string;
  actorId?: string;
  entity: string;
  entityId?: string;
  action: string;
  diff?: Record<string, unknown>;
}

/**
 * Servicio transversal de auditoría. Toda alerta y cambio de estado operativo
 * relevante debe quedar trazado para que la operación sea auditable.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.auditLogs.save(this.auditLogs.create(entry));
  }
}
