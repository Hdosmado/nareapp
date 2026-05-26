import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssignmentStatus } from '../../../common/enums';

/**
 * Franja horaria operativa (hora local Argentina, [desde, hasta)).
 * - madrugada: 00:00-05:59
 * - manana:    06:00-11:59
 * - tarde:     12:00-17:59
 * - noche:     18:00-23:59
 */
export enum FranjaHoraria {
  MADRUGADA = 'madrugada',
  MANANA = 'manana',
  TARDE = 'tarde',
  NOCHE = 'noche',
}

/** Filtros para los listados operativos del panel de coordinación. */
export class QueryServicesDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(FranjaHoraria)
  franja?: FranjaHoraria;
}
