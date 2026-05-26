import { PartialType } from '@nestjs/mapped-types';
import { CreateLocationEventDto } from './create-location-event.dto';

/** Datos para actualizar un punto de tracking (todos los campos opcionales). */
export class UpdateLocationEventDto extends PartialType(
  CreateLocationEventDto,
) {}
