import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProviderStatus, ProviderType } from '../../../common/enums';
import { ProviderRole } from './provider-role.entity';

/**
 * Prestador que ejecuta los servicios domiciliarios de cuidado.
 * Se autentica en la app mobile con email + contraseña.
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

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: ProviderStatus, default: ProviderStatus.ACTIVO })
  estado: ProviderStatus;

  @OneToMany(() => ProviderRole, (role) => role.provider)
  roles: ProviderRole[];
}
