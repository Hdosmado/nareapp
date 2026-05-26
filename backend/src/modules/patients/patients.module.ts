import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientAddress } from './entities/patient-address.entity';
import { Patient } from './entities/patient.entity';
import { PatientAddressesController } from './patient-addresses.controller';
import { PatientAddressesService } from './patient-addresses.service';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, PatientAddress])],
  controllers: [PatientsController, PatientAddressesController],
  providers: [PatientsService, PatientAddressesService],
  exports: [PatientsService, PatientAddressesService, TypeOrmModule],
})
export class PatientsModule {}
