import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ServiceAssignment } from '../../services/entities/service-assignment.entity';

/** Registro de cada notificación push enviada a un prestador. */
@Entity('notification_logs')
export class NotificationLog extends BaseEntity {
  @ManyToOne(() => Provider, { nullable: true })
  provider: Provider;

  @ManyToOne(() => ServiceAssignment, { nullable: true })
  assignment: ServiceAssignment;

  @Column()
  type: string;

  @Column({ default: 'fcm' })
  channel: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ default: 'pendiente' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;
}
