import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderRoleDto } from './create-provider-role.dto';

/** Datos para editar un rol de prestador (todos los campos opcionales). */
export class UpdateProviderRoleDto extends PartialType(CreateProviderRoleDto) {}
