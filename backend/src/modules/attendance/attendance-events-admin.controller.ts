import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AttendanceEventsAdminService } from './attendance-events-admin.service';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';

/**
 * Endpoints admin de eventos de asistencia. El servidor es la autoridad
 * anti-fraude: los eventos son APPEND-ONLY (no hay PATCH/DELETE para que un
 * coordinador no pueda fabricar/alterar presencia) y restringidos a ADMIN.
 *
 * El alta (`POST`) solo sirve para registrar una corrección/excepción MANUAL:
 * queda marcada como origen manual (con el usuario que la creó) y los campos
 * anti-fraude (insideAllowedRadius, distanceToAddress, timestampServer) NO se
 * toman del body — el motor de riesgo no la trata como prueba GPS.
 */
@Roles(UserRole.ADMIN)
@Controller('coordination/attendance-events')
export class AttendanceEventsAdminController {
  constructor(private readonly events: AttendanceEventsAdminService) {}

  @Post()
  create(
    @Body() dto: CreateAttendanceEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
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
