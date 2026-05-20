import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ProviderType } from '../../../common/enums';

/** Datos para dar de alta un prestador desde el panel de coordinación. */
export class CreateProviderDto {
  @IsString()
  apellido: string;

  @IsString()
  nombre: string;

  @IsEnum(ProviderType)
  tipoPrestador: ProviderType;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ProviderType, { each: true })
  roles?: ProviderType[];
}
