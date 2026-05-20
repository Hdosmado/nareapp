import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
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
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
