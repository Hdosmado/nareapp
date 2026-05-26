import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DevicePlatform, DeviceStatus } from '../../../common/enums';
import { Provider } from '../../providers/entities/provider.entity';

/**
 * Dispositivo mobile vinculado a un prestador. Debe ser aprobado desde el
 * panel de coordinación antes de poder operar.
 */
@Entity('provider_devices')
export class ProviderDevice extends BaseEntity {
  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  provider: Provider;

  @Index()
  @Column()
  deviceId: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  plataforma: DevicePlatform;

  @Column({ nullable: true })
  modelo: string;

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true })
  appVersion: string;

  @Column({ type: 'text', nullable: true })
  pushToken: string | null;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.PENDIENTE })
  estado: DeviceStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;
}
