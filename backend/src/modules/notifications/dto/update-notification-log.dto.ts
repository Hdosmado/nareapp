import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationLogDto } from './create-notification-log.dto';

/** Datos para actualizar un log de notificación (campos opcionales). */
export class UpdateNotificationLogDto extends PartialType(
  CreateNotificationLogDto,
) {}
