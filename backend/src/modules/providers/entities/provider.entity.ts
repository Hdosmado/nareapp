import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProviderStatus, ProviderType } from '../../../common/enums';
import { ProviderRole } from './provider-role.entity';

/**
 * Prestador que ejecuta los servicios domiciliarios de cuidado.
 * Puede darse de alta desde el panel (email + contraseña) o por activación de
 * dispositivo vía QR (email sin contraseña: el teléfono activado es su
 * credencial).
 */
@Entity('providers')
export class Provider extends BaseEntity {
  @Column()
  apellido: string;

  @Column()
  nombre: string;

  @Column({ type: 'enum', enum: ProviderType })
  tipoPrestador: ProviderType;

  @Column({ nullable: true })
  telefono: string;

  // Se solicita siempre (panel y alta por QR). Único: el índice admite varios
  // NULL para tolerar registros heredados sin email.
  @Index({ unique: true })
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: ProviderStatus, default: ProviderStatus.ACTIVO })
  estado: ProviderStatus;

  @OneToMany(() => ProviderRole, (role) => role.provider)
  roles: ProviderRole[];
}
