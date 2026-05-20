import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderRole } from './entities/provider-role.entity';
import { Provider } from './entities/provider.entity';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, ProviderRole])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService, TypeOrmModule],
})
export class ProvidersModule {}
