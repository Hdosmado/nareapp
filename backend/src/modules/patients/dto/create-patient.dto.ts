import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

/** Datos para dar de alta una persona a cuidar. */
export class CreatePatientDto {
  @IsString()
  apellido: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  telefonoContacto?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
