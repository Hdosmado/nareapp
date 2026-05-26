import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CoordinationActionType } from '../../../common/enums';

/** Datos para registrar una acción de coordinación sobre una asignación. */
export class CreateCoordinationActionDto {
  @IsUUID()
  assignmentId: string;

  @IsUUID()
  coordinatorId: string;

  @IsEnum(CoordinationActionType)
  actionType: CoordinationActionType;

  @IsOptional()
  @IsString()
  notes?: string;
}
