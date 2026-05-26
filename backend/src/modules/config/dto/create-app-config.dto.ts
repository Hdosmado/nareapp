import { IsIn, IsOptional, IsString } from 'class-validator';

/** Datos para dar de alta un parámetro de configuración de la app. */
export class CreateAppConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsIn(['number', 'string', 'boolean'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
