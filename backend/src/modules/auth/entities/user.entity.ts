import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserRole, UserStatus } from '../../../common/enums';

/** Usuario del panel web de coordinación (admin o coordinador). */
@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  nombre: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.COORDINADOR })
  rol: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVO })
  estado: UserStatus;

  /**
   * Versión del refresh token. Se incluye como claim `tv` en los refresh tokens
   * del panel; al cerrar sesión se incrementa para revocar de golpe todas las
   * sesiones activas del usuario (un refresh con `tv` viejo queda inválido).
   */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;
}
