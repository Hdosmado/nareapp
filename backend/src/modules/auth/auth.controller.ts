import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

/** Nombre de la cookie HttpOnly que transporta el refresh token del panel. */
const REFRESH_COOKIE = 'nare_refresh';
/** Opciones de la cookie del refresh del panel (compartidas set/clear). */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login del prestador desde la app mobile. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.loginProvider(dto);
  }

  /**
   * Login del usuario del panel de coordinación. Además de devolver el refresh
   * token en el body (compatibilidad con clientes que lo lean), lo emite como
   * cookie HttpOnly `nare_refresh` para que el panel no lo exponga a JS.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('panel/login')
  async loginPanel(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.loginUser(dto);
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return result;
  }

  /**
   * Renueva el access token a partir de un refresh token válido.
   * El panel lo manda como cookie HttpOnly; la app mobile, en el body. Se lee
   * primero de la cookie y, si no está, del body (RefreshDto).
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    const tokens = await this.auth.refresh(refreshToken ?? '');
    // Si la sesión viajaba por cookie (panel), se renueva la cookie también.
    if (cookies?.[REFRESH_COOKIE]) {
      res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return tokens;
  }

  /**
   * Cierra la sesión del panel: limpia la cookie del refresh y, si hay un
   * refresh válido de usuario, revoca todas sus sesiones (incrementa
   * tokenVersion). Es público porque solo necesita el refresh para operar.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    await this.auth.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
    return { ok: true };
  }
}
