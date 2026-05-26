import { PartialType } from '@nestjs/mapped-types';
import { CreateAttendanceEventDto } from './create-attendance-event.dto';

/** Datos para actualizar un evento de asistencia (todos los campos opcionales). */
export class UpdateAttendanceEventDto extends PartialType(
  CreateAttendanceEventDto,
) {}
