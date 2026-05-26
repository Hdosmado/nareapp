import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderRole } from './entities/provider-role.entity';
import { Provider } from './entities/provider.entity';
import { ProviderRolesController } from './provider-roles.controller';
import { ProviderRolesService } from './provider-roles.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, ProviderRole])],
  controllers: [ProvidersController, ProviderRolesController],
  providers: [ProvidersService, ProviderRolesService],
  exports: [ProvidersService, TypeOrmModule],
})
export class ProvidersModule {}
