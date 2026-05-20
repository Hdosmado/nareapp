import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AlertsService } from './alerts.service';

/** Alertas operativas consultadas y gestionadas desde el panel. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list() {
    return this.alerts.listActive();
  }

  @Post(':id/resolve')
  resolve(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.alerts.resolve(id, user.sub);
  }
}
