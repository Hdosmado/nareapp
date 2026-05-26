import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DevicePlatform } from '../../../common/enums';

/**
 * Cuerpo que envía la app del prestador al reclamar un token de activación.
 * Es un endpoint público: la app todavía no tiene sesión.
 *
 * Debe traer exactamente una credencial: `activationCode` (mecanismo principal,
 * el código corto que el prestador tipea) o `activationToken` (el token del QR).
 * La validación de "exactamente una" se hace en el servicio.
 */
export class ClaimActivationDto {
  /**
   * Código corto de activación. El prestador lo tipea; puede llegar con
   * guiones o espacios y se normaliza a 8 dígitos en el servidor.
   */
  @IsOptional()
  @IsString()
  activationCode?: string;

  /** Token en claro extraído del QR escaneado (alternativa al código). */
  @IsOptional()
  @IsString()
  activationToken?: string;

  /** Identificador lógico del dispositivo (lo captura la app). */
  @IsString()
  deviceId: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  model?: string;

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
