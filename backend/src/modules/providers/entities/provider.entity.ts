import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProviderStatus, ProviderType } from '../../../common/enums';
import { ProviderRole } from './provider-role.entity';

/**
 * Prestador que ejecuta los servicios domiciliarios de cuidado.
 * Se da de alta desde el panel con sus datos de identidad (incluido el DNI) y
 * activa su credencial por dispositivo (código de 8 dígitos / QR): el teléfono
 * activado es su credencial. La contraseña es opcional y heredada; un prestador
 * sin contraseña no puede loguear por email, sólo por dispositivo.
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

  // Documento de identidad. Reemplaza a la contraseña en el alta desde el
  // panel. Único tolerando NULL (conviven prestadores sin DNI cargado).
  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  dni: string | null;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: ProviderStatus, default: ProviderStatus.ACTIVO })
  estado: ProviderStatus;

  @OneToMany(() => ProviderRole, (role) => role.provider)
  roles: ProviderRole[];
}
