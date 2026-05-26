import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientAddressDto } from './create-patient-address.dto';

/** Datos para actualizar un domicilio (todos los campos opcionales). */
export class UpdatePatientAddressDto extends PartialType(CreatePatientAddressDto) {}
