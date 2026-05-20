import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DevicesService } from './devices.service';

/** Aprobación de dispositivos desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/devices')
export class CoordinationDevicesController {
  constructor(private readonly devices: DevicesService) {}

  /** Lista los dispositivos pendientes de aprobación. */
  @Get('pending')
  pending() {
    return this.devices.listPending();
  }

  @Post(':id/approve')
  approve(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.approve(id, user.sub);
  }

  @Post(':id/reject')
  reject(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.reject(id, user.sub);
  }

  @Post(':id/revoke')
  revoke(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.revoke(id, user.sub);
  }
}
