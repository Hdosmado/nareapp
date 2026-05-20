import { IsUUID } from 'class-validator';

/** Datos para asignar un prestador de reemplazo a un servicio. */
export class AssignReplacementDto {
  @IsUUID()
  providerId: string;
}
