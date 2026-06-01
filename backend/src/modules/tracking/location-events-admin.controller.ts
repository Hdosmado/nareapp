import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateLocationEventDto } from './dto/create-location-event.dto';
import { LocationEventsAdminService } from './location-events-admin.service';

/**
 * Endpoints admin de puntos de tracking. El servidor es la autoridad
 * anti-fraude: los puntos son APPEND-ONLY (sin PATCH/DELETE para que un
 * coordinador no pueda fabricar/alterar el rastro de ubicación) y restringidos
 * a ADMIN.
 *
 * El alta (`POST`) solo registra una corrección/excepción MANUAL: queda marcada
 * como origen manual (con el usuario que la creó) y los campos anti-fraude
 * (insideGeofence, timestampServer) NO se toman del body — el motor de riesgo
 * no la trata como prueba GPS.
 */
@Roles(UserRole.ADMIN)
@Controller('coordination/location-events')
export class LocationEventsAdminController {
  constructor(private readonly events: LocationEventsAdminService) {}

  @Post()
  create(@Body() dto: CreateLocationEventDto, @CurrentUser() user: JwtPayload) {
    return this.events.create(dto, { creadoManualmentePorUsuarioId: user.sub });
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.events.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.events.findOne(id);
  }
}
