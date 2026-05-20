import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from './entities/pre-service-location-event.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PreServiceLocationEvent,
      ServiceAssignment,
      ProviderDevice,
    ]),
    DevicesModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
