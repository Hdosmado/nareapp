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
import { AppConfigAdminService } from './app-config-admin.service';
import { CreateAppConfigDto } from './dto/create-app-config.dto';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';

/** ABM de parámetros de configuración de la app desde el panel. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/app-config')
export class AppConfigAdminController {
  constructor(private readonly appConfig: AppConfigAdminService) {}

  @Post()
  create(@Body() dto: CreateAppConfigDto) {
    return this.appConfig.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.appConfig.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.appConfig.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateAppConfigDto) {
    return this.appConfig.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.appConfig.remove(id);
  }
}
