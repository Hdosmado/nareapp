import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/enums';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { ServicesService } from './services.service';

/** Gestión y consulta de servicios desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  createService(@Body() dto: CreateServiceDto) {
    return this.services.createService(dto);
  }

  /** Asignaciones del día (rutas estáticas declaradas antes que `:id`). */
  @Get('today')
  today(@Query() query: QueryServicesDto) {
    return this.services.getTodayForCoordination(query);
  }

  @Get('risk')
  risk() {
    return this.services.getRiskForCoordination();
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.services.findAssignment(id);
  }
}
