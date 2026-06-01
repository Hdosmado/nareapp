import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ConnectivityStatus, LocationPermission } from '../../../common/enums';

/**
 * Latido de ubicación reportado por la app. Se usa en toda la ventana de
 * tracking (previo, en servicio y post-fin); el servidor decide el tramo
 * según el estado de la asignación.
 */
export class PreServiceLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @IsEnum(ConnectivityStatus)
  connectivityStatus?: ConnectivityStatus;

  @IsOptional()
  @IsEnum(LocationPermission)
  locationPermission?: LocationPermission;

  /**
   * La app reporta que la ubicación es simulada (mock location). Es una pista
   * anti-fraude: el servidor no confía en ella como presencia válida y la
   * marca como sospechosa. El valor lo decide la app, pero el servidor nunca
   * lo usa para "validar" presencia, sólo para invalidarla.
   */
  @IsOptional()
  @IsBoolean()
  isMocked?: boolean;

  @IsOptional()
  @IsDateString()
  timestampLocal?: string;

  @IsString()
  idempotencyKey: string;
}
