import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AssignmentStatus, RiskLevel } from '../../../common/enums';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** Alcance temporal del listado de servicios del panel. */
export enum ServiceScope {
  /** Solo los servicios de hoy (hora local Argentina). */
  HOY = 'hoy',
  /** Todos los servicios, sin recorte por fecha. */
  TODOS = 'todos',
}

/** Convierte `'true' | '1'` (query string) a booleano. */
const toBool = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true' || value === '1';

/**
 * Filtros del listado maestro de servicios del panel. Todos operan en el
 * servidor (no solo sobre la página cargada): el estado, el riesgo, "sin
 * asignar" y "requiere reemplazo" se resuelven contra la asignación activa.
 */
export class QueryServiceListDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ServiceScope)
  scope?: ServiceScope;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  risk?: RiskLevel;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  sinAsignar?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  replacement?: boolean;
}
