import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProvidersService } from './providers.service';

/** ABM de prestadores desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.providers.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.providers.findOne(id);
  }
}
