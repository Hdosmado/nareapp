import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { CreateNotificationLogDto } from './dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from './dto/update-notification-log.dto';
import { NotificationLogsAdminService } from './notification-logs-admin.service';

/** ABM de logs de notificación desde el panel. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/notification-logs')
export class NotificationLogsAdminController {
  constructor(private readonly logs: NotificationLogsAdminService) {}

  @Post()
  create(@Body() dto: CreateNotificationLogDto) {
    return this.logs.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.logs.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.logs.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateNotificationLogDto) {
    return this.logs.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.logs.remove(id);
  }
}
