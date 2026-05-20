import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ConnectivityStatus } from '../../../common/enums';
import { ProviderDevice } from '../../devices/entities/provider-device.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ServiceAssignment } from '../../services/entities/service-assignment.entity';

/**
 * Punto de ubicación capturado durante la ventana de tracking previa al
 * inicio del servicio. El tracking NO es permanente: existe solo desde X
 * minutos antes del inicio hasta que el prestador confirma "LLEGUÉ".
 */
@Index(['assignment', 'timestampServer'])
@Entity('pre_service_location_events')
export class PreServiceLocationEvent extends BaseEntity {
  @ManyToOne(() => ServiceAssignment, { onDelete: 'CASCADE' })
  assignment: ServiceAssignment;

  @ManyToOne(() => Provider)
  provider: Provider;

  @ManyToOne(() => ProviderDevice, { nullable: true })
  device: ProviderDevice;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  accuracy: number;

  @Column({ type: 'int', nullable: true })
  batteryLevel: number;

  @Column({
    type: 'enum',
    enum: ConnectivityStatus,
    default: ConnectivityStatus.UNKNOWN,
  })
  connectivityStatus: ConnectivityStatus;

  @Column({ default: 'pre_servicio_tracking' })
  origin: string;

  @Column({ type: 'timestamptz', nullable: true })
  timestampLocal: Date;

  @Column({ type: 'timestamptz' })
  timestampServer: Date;

  @Index({ unique: true })
  @Column()
  idempotencyKey: string;
}
