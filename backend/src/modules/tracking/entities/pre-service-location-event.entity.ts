import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ConnectivityStatus, LocationPermission } from '../../../common/enums';
import { ProviderDevice } from '../../devices/entities/provider-device.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ServiceAssignment } from '../../services/entities/service-assignment.entity';

/**
 * Punto de ubicación (latido) reportado por la app del prestador. Cubre toda
 * la ventana de tracking automático: desde `tracking.lead_min` antes del
 * inicio, durante el servicio (tras "LLEGUÉ") y hasta `tracking.trail_min`
 * después del fin. El campo `origin` distingue el tramo (`pre_servicio`,
 * `en_servicio`, `post_servicio`).
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

  /**
   * Si el punto cae dentro del radio permitido del domicilio. Lo calcula el
   * servidor a partir de la ubicación y `allowedRadiusM`; `null` cuando el
   * domicilio no tiene coordenadas. Alimenta la detección de "salió del radio".
   */
  @Column({ type: 'boolean', nullable: true })
  insideGeofence: boolean | null;

  /**
   * Nivel de permiso de ubicación que reporta la app en el latido. Permite
   * detectar que el permiso dejó de ser "Siempre" durante el servicio.
   */
  @Column({ type: 'varchar', nullable: true })
  locationPermission: LocationPermission | null;

  /**
   * La app reporta que la ubicación es simulada (mock location). El servidor
   * NO la trata como presencia válida: nunca se considera dentro de la
   * geocerca y queda marcada como sospechosa para el motor de riesgo.
   */
  @Column({ type: 'boolean', default: false })
  isMocked: boolean;

  /**
   * El servidor marcó el latido como sospechoso por una señal anti-fraude:
   * ubicación simulada, precisión inservible (`accuracy` muy alta), salto
   * físicamente imposible entre latidos (velocidad implausible) o timestamp
   * fuera de rango. El motor de riesgo lo usa como indicio de falseo.
   */
  @Column({ type: 'boolean', default: false })
  suspicious: boolean;

  /**
   * Motivo legible por el que el servidor marcó el latido como sospechoso
   * (`mocked`, `accuracy`, `speed_jump`, `bad_timestamp`). `null` cuando el
   * latido es plausible. Sirve para auditoría y para el motor de riesgo.
   */
  @Column({ type: 'varchar', nullable: true })
  suspiciousReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  timestampLocal: Date;

  @Column({ type: 'timestamptz' })
  timestampServer: Date;

  @Index({ unique: true })
  @Column()
  idempotencyKey: string;
}
