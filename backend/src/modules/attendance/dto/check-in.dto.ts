import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos del evento "LLEGUÉ" enviado por la app mobile. */
export class CheckInDto {
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

  /**
   * Bandera anti-spoofing: la app reporta si la ubicación proviene de un
   * proveedor simulado (mock location). El servidor no confía ciegamente en
   * ella, pero un `true` es un indicio fuerte de fraude y se trata como tal.
   */
  @IsOptional()
  @IsBoolean()
  isMocked?: boolean;

  @IsOptional()
  @IsDateString()
  timestampLocal?: string;

  /** Clave de idempotencia generada por la app para tolerar reenvíos. */
  @IsString()
  idempotencyKey: string;

  /** Motivo breve cuando la llegada se confirma fuera del radio permitido. */
  @IsOptional()
  @IsString()
  exceptionReason?: string;
}
