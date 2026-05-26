import { PartialType } from '@nestjs/mapped-types';
import { CreateAlertDto } from './create-alert.dto';

/** Datos para actualizar una alerta operativa (todos los campos opcionales). */
export class UpdateAlertDto extends PartialType(CreateAlertDto) {}
