import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '../../../common/enums';

/** Datos enviados por la app mobile al registrar/re-registrar un dispositivo. */
export class RegisterDeviceDto {
  @IsString()
  deviceId: string;

  @IsEnum(DevicePlatform)
  plataforma: DevicePlatform;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  pushToken?: string;
}
