import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

/** Datos para dar de alta una persona a cuidar. */
export class CreatePatientDto {
  @IsString()
  apellido: string;

  @IsString()
  nombre: string;

  // Documento de identidad. Obligatorio y único: evita altas duplicadas.
  @IsString()
  dni: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  telefonoContacto?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaNombre?: string;

  @IsOptional()
  @IsString()
  contactoEmergenciaTelefono?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
