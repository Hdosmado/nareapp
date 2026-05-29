import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AttendanceType } from '../../../common/enums';

/** Datos para crear un evento de asistencia desde el panel de coordinación. */
export class CreateAttendanceEventDto {
  /** Asignación de servicio a la que pertenece el evento. */
  @IsUUID()
  assignmentId: string;

  /** Tipo de evento: check_in ("LLEGUÉ") o check_out (fin de servicio). */
  @IsEnum(AttendanceType)
  type: AttendanceType;

  /** Clave de idempotencia para tolerar reenvíos. */
  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  distanceToAddress?: number;

  @IsOptional()
  @IsBoolean()
  insideAllowedRadius?: boolean;

  @IsOptional()
  @IsDateString()
  timestampLocal?: string;

  @IsOptional()
  @IsDateString()
  timestampServer?: string;

  /** Motivo breve cuando la confirmación se hace fuera del radio permitido. */
  @IsOptional()
  @IsString()
  exceptionReason?: string;

  /** Motivo opcional cuando el prestador finaliza antes del horario previsto. */
  @IsOptional()
  @IsString()
  earlyCheckoutReason?: string;
}
