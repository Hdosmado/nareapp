import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AttendanceType } from '../../../common/enums';
import { ProviderDevice } from '../../devices/entities/provider-device.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ServiceAssignment } from '../../services/entities/service-assignment.entity';

/**
 * Evento de asistencia: confirmación de llegada (check_in / "LLEGUÉ") o de
 * fin de servicio (check_out). `idempotencyKey` evita duplicados en reenvíos
 * desde la app mobile bajo conectividad irregular.
 */
@Entity('attendance_events')
export class AttendanceEvent extends BaseEntity {
  @ManyToOne(() => ServiceAssignment, { onDelete: 'CASCADE' })
  assignment: ServiceAssignment;

  @ManyToOne(() => Provider)
  provider: Provider;

  @ManyToOne(() => ProviderDevice, { nullable: true })
  device: ProviderDevice;

  @Column({ type: 'enum', enum: AttendanceType })
  type: AttendanceType;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  accuracy: number;

  @Column({ type: 'double precision', nullable: true })
  distanceToAddress: number;

  @Column({ nullable: true })
  insideAllowedRadius: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  timestampLocal: Date;

  @Column({ type: 'timestamptz' })
  timestampServer: Date;

  @Column({ default: false })
  offlineSynced: boolean;

  @Column({ type: 'text', nullable: true })
  exceptionReason: string;

  /** Motivo opcional informado por el prestador al finalizar antes de tiempo. */
  @Column({ type: 'text', nullable: true })
  earlyCheckoutReason: string | null;

  @Index({ unique: true })
  @Column()
  idempotencyKey: string;
}
