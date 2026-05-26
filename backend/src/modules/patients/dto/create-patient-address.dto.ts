import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** Datos para dar de alta un domicilio asociado a una persona a cuidar. */
export class CreatePatientAddressDto {
  @IsUUID()
  patientId: string;

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
