import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/** Domicilio donde se presta el servicio. */
export class CreateAddressDto {
  @IsString()
  calle: string;

  @IsString()
  ciudad: string;

  @IsString()
  provincia: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(2000)
  allowedRadiusM?: number;
}
