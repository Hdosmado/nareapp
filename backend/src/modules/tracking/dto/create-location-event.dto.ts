import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ConnectivityStatus } from '../../../common/enums';

/** Datos para crear un punto de tracking previo al servicio desde el panel. */
export class CreateLocationEventDto {
  /** Asignación de servicio a la que pertenece el punto de ubicación. */
  @IsUUID()
  assignmentId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  /** Clave de idempotencia para tolerar reenvíos. */
  @IsString()
  idempotencyKey: string;

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
  @IsString()
  origin?: string;

  @IsOptional()
  @IsDateString()
  timestampLocal?: string;

  @IsOptional()
  @IsDateString()
  timestampServer?: string;
}
