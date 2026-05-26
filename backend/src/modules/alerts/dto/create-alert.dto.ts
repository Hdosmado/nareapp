import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AlertSeverity, AlertStatus, AlertType } from '../../../common/enums';

/** Datos para crear una alerta operativa desde el panel de coordinación. */
export class CreateAlertDto {
  /** Asignación de servicio a la que pertenece la alerta. */
  @IsUUID()
  assignmentId: string;

  @IsEnum(AlertType)
  type: AlertType;

  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;
}
