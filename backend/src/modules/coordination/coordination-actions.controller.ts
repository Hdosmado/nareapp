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
import { CoordinationActionsService } from './coordination-actions.service';
import { CreateCoordinationActionDto } from './dto/create-coordination-action.dto';
import { UpdateCoordinationActionDto } from './dto/update-coordination-action.dto';

/** ABM de acciones de coordinación desde el panel. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/actions')
export class CoordinationActionsController {
  constructor(private readonly actions: CoordinationActionsService) {}

  @Post()
  create(@Body() dto: CreateCoordinationActionDto) {
    return this.actions.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.actions.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.actions.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateCoordinationActionDto) {
    return this.actions.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.actions.remove(id);
  }
}
