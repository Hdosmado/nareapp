import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Provider } from '../providers/entities/provider.entity';
import { CoordinationDevicesController } from './coordination-devices.controller';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { ProviderDevice } from './entities/provider-device.entity';
import { DeviceApprovedGuard } from './guards/device-approved.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderDevice, Provider]),
    NotificationsModule,
  ],
  controllers: [DevicesController, CoordinationDevicesController],
  providers: [DevicesService, DeviceApprovedGuard],
  exports: [DevicesService, DeviceApprovedGuard, TypeOrmModule],
})
export class DevicesModule {}
