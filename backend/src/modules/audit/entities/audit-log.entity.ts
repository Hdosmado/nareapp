import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Registro de auditoría. Toda alerta y cambio de estado operativo queda
 * trazado para que la operación sea auditable.
 */
@Index(['entity', 'entityId'])
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ comment: 'Tipo de actor: user, provider, system' })
  actorType: string;

  @Column({ type: 'uuid', nullable: true })
  actorId: string;

  @Column()
  entity: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  diff: Record<string, unknown>;
}
