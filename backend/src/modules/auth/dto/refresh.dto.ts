import { IsJWT } from 'class-validator';

/** Cuerpo para renovar el access token. */
export class RefreshDto {
  @IsJWT()
  refreshToken: string;
}
