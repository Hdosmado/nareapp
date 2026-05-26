import { IsEnum, IsUUID } from 'class-validator';
import { ProviderType } from '../../../common/enums';

/** Datos para asignar un rol operativo a un prestador. */
export class CreateProviderRoleDto {
  @IsUUID()
  providerId: string;

  @IsEnum(ProviderType)
  rol: ProviderType;
}
