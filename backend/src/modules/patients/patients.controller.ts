import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PatientsService } from './patients.service';

/** ABM de personas a cuidar desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patients.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.patients.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.patients.findOne(id);
  }

  @Post(':id/addresses')
  addAddress(@Param() { id }: IdParamDto, @Body() dto: CreateAddressDto) {
    return this.patients.addAddress(id, dto);
  }
}
