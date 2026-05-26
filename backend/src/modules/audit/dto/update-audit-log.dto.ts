import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditLogDto } from './create-audit-log.dto';

/** Datos para actualizar una entrada de auditoría (campos opcionales). */
export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {}
