import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProviderType } from '../../../common/enums';
import { Provider } from './provider.entity';

/** Rol operativo de un prestador. Un prestador puede tener más de uno. */
@Entity('provider_roles')
export class ProviderRole extends BaseEntity {
  @ManyToOne(() => Provider, (provider) => provider.roles, {
    onDelete: 'CASCADE',
  })
  provider: Provider;

  @Column({ type: 'enum', enum: ProviderType })
  rol: ProviderType;
}
