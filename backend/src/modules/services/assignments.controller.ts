import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProviderGuard } from '../../common/guards/provider.guard';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DeviceApprovedGuard } from '../devices/guards/device-approved.guard';
import { ServicesService } from './services.service';

/** Servicios asignados consultados desde la app mobile del prestador. */
@UseGuards(ProviderGuard, DeviceApprovedGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly services: ServicesService) {}

  /** Servicios asignados del día. */
  @Get('today')
  today(@CurrentUser() user: JwtPayload) {
    return this.services.getTodayForProvider(user.sub);
  }

  /** Servicio actual o próximo. */
  @Get('current')
  current(@CurrentUser() user: JwtPayload) {
    return this.services.getCurrentForProvider(user.sub);
  }
}
