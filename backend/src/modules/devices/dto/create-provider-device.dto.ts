import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DevicePlatform, DeviceStatus } from '../../../common/enums';

/** Datos para dar de alta un dispositivo de prestador desde coordinación. */
export class CreateProviderDeviceDto {
  @IsUUID()
  providerId: string;

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

  @IsOptional()
  @IsEnum(DeviceStatus)
  estado?: DeviceStatus;
}
