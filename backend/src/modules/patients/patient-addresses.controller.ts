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
import { CreatePatientAddressDto } from './dto/create-patient-address.dto';
import { UpdatePatientAddressDto } from './dto/update-patient-address.dto';
import { PatientAddressesService } from './patient-addresses.service';

/** ABM de domicilios de personas a cuidar desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/patient-addresses')
export class PatientAddressesController {
  constructor(private readonly addresses: PatientAddressesService) {}

  @Post()
  create(@Body() dto: CreatePatientAddressDto) {
    return this.addresses.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.addresses.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.addresses.findOne(id);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdatePatientAddressDto) {
    return this.addresses.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.addresses.remove(id);
  }
}
