import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CoordinationService } from './coordination.service';
import { AssignReplacementDto } from './dto/assign-replacement.dto';
import { CoordinationActionDto } from './dto/coordination-action.dto';

/** Tablero y acciones del panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination')
export class CoordinationController {
  constructor(private readonly coordination: CoordinationService) {}

  /** Resumen del tablero operativo del día. */
  @Get('dashboard')
  dashboard() {
    return this.coordination.getDashboard();
  }

  /** Mapa operativo: domicilio y última ubicación del prestador. */
  @Get('services/:id/last-location')
  lastLocation(@Param() { id }: IdParamDto) {
    return this.coordination.getLastLocation(id);
  }

  @Post('services/:id/mark-contacted')
  markContacted(
    @Param() { id }: IdParamDto,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CoordinationActionDto,
  ) {
    return this.coordination.markContacted(id, user.sub, dto);
  }

  @Post('services/:id/require-replacement')
  requireReplacement(
    @Param() { id }: IdParamDto,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CoordinationActionDto,
  ) {
    return this.coordination.requireReplacement(id, user.sub, dto);
  }

  @Post('services/:id/assign-replacement')
  assignReplacement(
    @Param() { id }: IdParamDto,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignReplacementDto,
  ) {
    return this.coordination.assignReplacement(id, user.sub, dto);
  }
}
