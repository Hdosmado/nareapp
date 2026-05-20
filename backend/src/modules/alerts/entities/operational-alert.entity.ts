import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AlertSeverity, AlertStatus, AlertType } from '../../../common/enums';
import { User } from '../../auth/entities/user.entity';
import { ServiceAssignment } from '../../services/entities/service-assignment.entity';

/**
 * Alerta operativa generada por el motor de riesgo. La consume el panel de
 * coordinación para reaccionar antes del horario del servicio.
 */
@Index(['status'])
@Entity('operational_alerts')
export class OperationalAlert extends BaseEntity {
  @ManyToOne(() => ServiceAssignment, { onDelete: 'CASCADE' })
  assignment: ServiceAssignment;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.ABIERTA })
  status: AlertStatus;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  assignedCoordinator: User;
}
