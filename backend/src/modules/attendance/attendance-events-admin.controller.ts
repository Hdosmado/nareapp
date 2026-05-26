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
import { AttendanceEventsAdminService } from './attendance-events-admin.service';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { UpdateAttendanceEventDto } from './dto/update-attendance-event.dto';

/** ABM de eventos de asistencia desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/attendance-events')
export class AttendanceEventsAdminController {
  constructor(private readonly events: AttendanceEventsAdminService) {}

  @Post()
  create(@Body() dto: CreateAttendanceEventDto) {
    return this.events.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.events.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.events.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateAttendanceEventDto) {
    return this.events.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.events.remove(id);
  }
}
