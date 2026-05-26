import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

/** Alertas operativas consultadas y gestionadas desde el panel. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Post()
  create(@Body() dto: CreateAlertDto) {
    return this.alerts.create(dto);
  }

  @Get()
  list() {
    return this.alerts.listActive();
  }

  @Post(':id/resolve')
  resolve(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.alerts.resolve(id, user.sub);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.alerts.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateAlertDto) {
    return this.alerts.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.alerts.remove(id);
  }
}
