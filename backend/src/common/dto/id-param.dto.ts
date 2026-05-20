import { IsUUID } from 'class-validator';

/** Valida que el parámetro de ruta `:id` sea un UUID. */
export class IdParamDto {
  @IsUUID()
  id: string;
}
