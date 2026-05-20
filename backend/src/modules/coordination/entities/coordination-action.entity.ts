import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CoordinationActionType } from '../../../common/enums';
import { User } from '../../auth/entities/user.entity';
import { ServiceAssignment } from '../../services/entities/service-assignment.entity';

/** Registro de una acción tomada por coordinación sobre un servicio. */
@Entity('coordination_actions')
export class CoordinationAction extends BaseEntity {
  @ManyToOne(() => ServiceAssignment, { onDelete: 'CASCADE' })
  assignment: ServiceAssignment;

  @ManyToOne(() => User)
  coordinator: User;

  @Column({ type: 'enum', enum: CoordinationActionType })
  actionType: CoordinationActionType;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
