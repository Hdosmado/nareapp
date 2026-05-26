import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Provider } from '../providers/entities/provider.entity';
import { CoordinationDevicesController } from './coordination-devices.controller';
import { DeviceActivationService } from './device-activation.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceActivationToken } from './entities/device-activation-token.entity';
import { ProviderDevice } from './entities/provider-device.entity';
import { DeviceApprovedGuard } from './guards/device-approved.guard';
import { MobileActivationController } from './mobile-activation.controller';
import { ProviderActivationController } from './provider-activation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderDevice, Provider, DeviceActivationToken]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    DevicesController,
    CoordinationDevicesController,
    MobileActivationController,
    ProviderActivationController,
  ],
  providers: [DevicesService, DeviceActivationService, DeviceApprovedGuard],
  exports: [DevicesService, DeviceApprovedGuard, TypeOrmModule],
})
export class DevicesModule {}
