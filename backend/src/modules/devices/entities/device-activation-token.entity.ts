import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ActivationTokenStatus } from '../../../common/enums';
import { Provider } from '../../providers/entities/provider.entity';

/**
 * Token de activación de un dispositivo de prestador. Coordinación lo genera
 * desde el panel para un prestador ya existente; la app del prestador lo
 * reclama una sola vez para vincular su teléfono.
 *
 * La misma fila tiene dos representaciones del mismo token de un solo uso:
 *
 *  - Código corto: `shortCodeHash` guarda el SHA-256 de un código numérico de
 *    8 dígitos. Es el mecanismo principal — se dicta por teléfono o se manda
 *    por WhatsApp, no necesita cámara ni deep link.
 *  - Token largo: `tokenHash` guarda el SHA-256 del token embebido en el QR,
 *    el mecanismo secundario.
 *
 * Ambas representaciones comparten un único `expiresAt` y se consumen juntas:
 * usar una marca la fila como `used` y deja la otra inválida.
 *
 * Seguridad: nunca se guarda el código ni el token en claro, solo sus hashes.
 */
@Entity('device_activation_tokens')
export class DeviceActivationToken extends BaseEntity {
  /** Prestador al que se vinculará el dispositivo. Siempre presente. */
  @ManyToOne(() => Provider, { nullable: false, onDelete: 'CASCADE' })
  provider: Provider;

  /** Hash SHA-256 del token largo del QR. El token en claro nunca se persiste. */
  @Index()
  @Column()
  tokenHash: string;

  /**
   * Hash SHA-256 del código corto numérico normalizado (solo dígitos).
   * El código en claro nunca se persiste.
   */
  @Index()
  @Column()
  shortCodeHash: string;

  @Column({
    type: 'enum',
    enum: ActivationTokenStatus,
    default: ActivationTokenStatus.PENDING,
  })
  status: ActivationTokenStatus;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date;

  /** Reclamos fallidos acumulados; al llegar al umbral el token se revoca. */
  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  /** Usuario de coordinación que generó el token. */
  @Column({ type: 'uuid' })
  createdByUserId: string;

  /** `deviceId` lógico que reclamó el token (solo cuando `status = used`). */
  @Column({ nullable: true })
  usedByDeviceId: string;
}
