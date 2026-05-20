import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { DevicesModule } from '../devices/devices.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [AttendanceModule, TrackingModule, DevicesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
