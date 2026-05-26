import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { AttendanceEventsAdminController } from './attendance-events-admin.controller';
import { AttendanceEventsAdminService } from './attendance-events-admin.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceEvent } from './entities/attendance-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceEvent,
      ServiceAssignment,
      ProviderDevice,
    ]),
    DevicesModule,
  ],
  controllers: [AttendanceController, AttendanceEventsAdminController],
  providers: [AttendanceService, AttendanceEventsAdminService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
