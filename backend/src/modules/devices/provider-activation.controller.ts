import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DeviceActivationService } from './device-activation.service';

/**
 * Generación y gestión de la activación del dispositivo desde el panel de
 * coordinación. `:id` es el id del prestador.
 */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/providers')
export class ProviderActivationController {
  constructor(private readonly activation: DeviceActivationService) {}

  /** Estado del dispositivo del prestador + si hay una activación vigente. */
  @Get(':id/device')
  device(@Param() { id }: IdParamDto) {
    return this.activation.getProviderDeviceState(id);
  }

  /**
   * Genera una activación para el prestador: devuelve el código corto, la URL
   * del QR, el vencimiento y el mensaje de WhatsApp. Revoca la anterior.
   */
  @HttpCode(HttpStatus.OK)
  @Post(':id/activation')
  generate(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.activation.generateActivation(id, user.sub);
  }

  /** Revoca la activación vigente del prestador. */
  @HttpCode(HttpStatus.OK)
  @Post(':id/activation/revoke')
  revoke(@Param() { id }: IdParamDto) {
    return this.activation.revokePendingTokens(id);
  }
}
