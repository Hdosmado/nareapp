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
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { ServicesService } from './services.service';

/** Asignación de prestadores a servicios desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/assignments')
export class CoordinationAssignmentsController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  create(@Body() dto: CreateAssignmentDto) {
    return this.services.createAssignment(dto);
  }

  /** Listado paginado de asignaciones operativas. */
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.services.findAllAssignments(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.services.findAssignment(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateAssignmentDto) {
    return this.services.updateAssignment(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.services.removeAssignment(id);
  }
}
