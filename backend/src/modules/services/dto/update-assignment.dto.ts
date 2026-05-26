import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AssignmentStatus, RiskLevel } from '../../../common/enums';

/**
 * Datos para actualizar una asignación operativa. Los campos editables son
 * distintos a los de creación, por eso no se usa PartialType.
 */
export class UpdateAssignmentDto {
  /** Reasigna la asignación a otro prestador. */
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsBoolean()
  replacementRequired?: boolean;
}
