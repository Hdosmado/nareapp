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
import { CreateLocationEventDto } from './dto/create-location-event.dto';
import { UpdateLocationEventDto } from './dto/update-location-event.dto';
import { LocationEventsAdminService } from './location-events-admin.service';

/** ABM de puntos de tracking previos al servicio desde el panel. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/location-events')
export class LocationEventsAdminController {
  constructor(private readonly events: LocationEventsAdminService) {}

  @Post()
  create(@Body() dto: CreateLocationEventDto) {
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
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateLocationEventDto) {
    return this.events.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.events.remove(id);
  }
}
