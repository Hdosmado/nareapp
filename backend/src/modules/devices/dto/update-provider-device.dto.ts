import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderDeviceDto } from './create-provider-device.dto';

/** Datos para actualizar un dispositivo (todos los campos opcionales). */
export class UpdateProviderDeviceDto extends PartialType(
  CreateProviderDeviceDto,
) {}
