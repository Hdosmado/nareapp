import { IsOptional, IsString } from 'class-validator';

/** Nota opcional asociada a una acción de coordinación. */
export class CoordinationActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
