import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProviderGuard } from '../../common/guards/provider.guard';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { NotificationsService } from './notifications.service';

/** Registro del token de push desde la app mobile. */
@UseGuards(ProviderGuard)
@Controller('push')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('register-token')
  registerToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notifications.registerPushToken(
      user.sub,
      dto.deviceId,
      dto.pushToken,
    );
  }
}
