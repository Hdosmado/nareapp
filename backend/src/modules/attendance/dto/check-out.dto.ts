import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos del evento "FIN DE SERVICIO" enviado por la app mobile. */
export class CheckOutDto {
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsDateString()
  timestampLocal?: string;

  @IsString()
  idempotencyKey: string;

  /** Motivo opcional cuando el prestador finaliza antes del horario previsto. */
  @IsOptional()
  @IsString()
  earlyCheckoutReason?: string;
}
