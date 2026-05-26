import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { DeviceActivationService } from './device-activation.service';
import { ClaimActivationDto } from './dto/claim-activation.dto';

/**
 * Endpoint público que consume la app del prestador para activarse.
 * Es público porque la app todavía no tiene sesión: el código (o el QR) es la
 * credencial. Lleva rate limiting por IP para frenar la fuerza bruta sobre el
 * código corto.
 */
@Controller('mobile/activation')
export class MobileActivationController {
  constructor(private readonly activation: DeviceActivationService) {}

  /** Reclama una activación: vincula el dispositivo y abre sesión. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('claim')
  claim(@Body() dto: ClaimActivationDto) {
    return this.activation.claimActivation(dto);
  }
}
