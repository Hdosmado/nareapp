import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/** Datos para editar un usuario del panel (todos los campos opcionales). */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
