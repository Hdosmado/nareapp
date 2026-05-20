import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ConnectivityStatus } from '../../../common/enums';

/** Punto de ubicación de la ventana de tracking previa al servicio. */
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
  @IsDateString()
  timestampLocal?: string;

  @IsString()
  idempotencyKey: string;
}
