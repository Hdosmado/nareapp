import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
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

  // Documento de identidad. Obligatorio y único por persona.
  @IsString()
  @IsNotEmpty()
  dni: string;

  // Heredada y opcional: el prestador activa su credencial por dispositivo
  // (código de 8 dígitos / QR), no por contraseña en el alta.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ProviderType, { each: true })
  roles?: ProviderType[];
}
