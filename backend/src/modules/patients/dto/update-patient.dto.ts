import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

/** Datos para actualizar una persona a cuidar (todos los campos opcionales). */
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
