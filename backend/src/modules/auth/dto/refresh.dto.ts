import { IsJWT, IsOptional } from 'class-validator';

/**
 * Cuerpo para renovar el access token.
 * El refresh del panel viaja como cookie HttpOnly (`nare_refresh`), por eso el
 * campo es opcional: la app mobile lo sigue mandando en el body y el panel lo
 * toma de la cookie. Si viene en el body, debe ser un JWT válido.
 */
export class RefreshDto {
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
