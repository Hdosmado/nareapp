import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientAddress } from '../patients/entities/patient-address.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Provider } from '../providers/entities/provider.entity';
import { DevicesModule } from '../devices/devices.module';
import { AssignmentsController } from './assignments.controller';
import { CoordinationAssignmentsController } from './coordination-assignments.controller';
import { ServiceAssignment } from './entities/service-assignment.entity';
import { Service } from './entities/service.entity';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Service,
      ServiceAssignment,
      Provider,
      Patient,
      PatientAddress,
    ]),
    DevicesModule,
  ],
  controllers: [
    ServicesController,
    CoordinationAssignmentsController,
    AssignmentsController,
  ],
  providers: [ServicesService],
  exports: [ServicesService, TypeOrmModule],
})
export class ServicesModule {}
