import { IsDateString, IsUUID } from 'class-validator';

/** Datos para crear un servicio (la prestación de cuidado a cubrir). */
export class CreateServiceDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  addressId: string;

  /** Día del servicio en formato YYYY-MM-DD. */
  @IsDateString()
  fecha: string;

  /** Inicio del servicio (ISO 8601, en UTC). */
  @IsDateString()
  startTime: string;

  /** Fin del servicio (ISO 8601, en UTC). */
  @IsDateString()
  endTime: string;
}
