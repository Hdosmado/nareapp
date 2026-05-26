import { PartialType } from '@nestjs/mapped-types';
import { CreateCoordinationActionDto } from './create-coordination-action.dto';

/** Datos para actualizar una acción de coordinación (campos opcionales). */
export class UpdateCoordinationActionDto extends PartialType(
  CreateCoordinationActionDto,
) {}
