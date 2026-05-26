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
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
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

  /** Listado paginado de servicios para el backoffice. */
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.services.findAllServices(pagination);
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

  /** Ficha de un servicio individual (id de la tabla `services`). */
  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.services.findService(id);
  }

  @Patch(':id')
  updateService(@Param() { id }: IdParamDto, @Body() dto: UpdateServiceDto) {
    return this.services.updateService(id, dto);
  }

  @Delete(':id')
  removeService(@Param() { id }: IdParamDto) {
    return this.services.removeService(id);
  }
}
