import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssignmentStatus } from '../../../common/enums';

/** Filtros para los listados operativos del panel de coordinación. */
export class QueryServicesDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
