import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/** Datos para registrar manualmente una entrada de auditoría. */
export class CreateAuditLogDto {
  @IsString()
  actorType: string;

  @IsString()
  entity: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsObject()
  diff?: Record<string, unknown>;
}
