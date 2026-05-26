import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';

/** Datos para actualizar un servicio: todos los campos son opcionales. */
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
