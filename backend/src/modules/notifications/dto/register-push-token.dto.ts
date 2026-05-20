import { IsString } from 'class-validator';

/** Datos para registrar/actualizar el token de push de un dispositivo. */
export class RegisterPushTokenDto {
  @IsString()
  deviceId: string;

  @IsString()
  pushToken: string;
}
