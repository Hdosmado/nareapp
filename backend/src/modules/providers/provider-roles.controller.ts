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
import { CreateProviderRoleDto } from './dto/create-provider-role.dto';
import { UpdateProviderRoleDto } from './dto/update-provider-role.dto';
import { ProviderRolesService } from './provider-roles.service';

/** ABM de roles operativos de prestadores desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/provider-roles')
export class ProviderRolesController {
  constructor(private readonly providerRoles: ProviderRolesService) {}

  @Post()
  create(@Body() dto: CreateProviderRoleDto) {
    return this.providerRoles.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.providerRoles.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.providerRoles.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateProviderRoleDto) {
    return this.providerRoles.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.providerRoles.remove(id);
  }
}
