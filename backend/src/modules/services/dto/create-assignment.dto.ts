import { IsUUID } from 'class-validator';

/** Datos para asignar un prestador a un servicio. */
export class CreateAssignmentDto {
  @IsUUID()
  serviceId: string;

  @IsUUID()
  providerId: string;
}
