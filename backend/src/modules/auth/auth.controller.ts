import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login del prestador desde la app mobile. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.loginProvider(dto);
  }

  /** Login del usuario del panel de coordinación. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('panel/login')
  loginPanel(@Body() dto: LoginDto) {
    return this.auth.loginUser(dto);
  }

  /** Renueva el access token a partir de un refresh token válido. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
