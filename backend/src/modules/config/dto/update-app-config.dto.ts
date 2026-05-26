import { PartialType } from '@nestjs/mapped-types';
import { CreateAppConfigDto } from './create-app-config.dto';

/** Datos para actualizar un parámetro de configuración (campos opcionales). */
export class UpdateAppConfigDto extends PartialType(CreateAppConfigDto) {}
