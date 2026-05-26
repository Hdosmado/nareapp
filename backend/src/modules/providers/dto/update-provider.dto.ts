import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderDto } from './create-provider.dto';

/** Datos para editar un prestador (todos los campos opcionales). */
export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
