import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { ProviderGuard } from '../../common/guards/provider.guard';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DeviceApprovedGuard } from '../devices/guards/device-approved.guard';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

/** Eventos de asistencia registrados desde la app mobile del prestador. */
@UseGuards(ProviderGuard, DeviceApprovedGuard)
@Controller('assignments')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /** Confirmación de llegada al domicilio ("LLEGUÉ"). */
  @Post(':id/check-in')
  checkIn(
    @Param() { id }: IdParamDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.attendance.checkIn(id, user.sub, deviceId, dto);
  }

  /** Fin del servicio ("FIN DE SERVICIO"). */
  @Post(':id/check-out')
  checkOut(
    @Param() { id }: IdParamDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendance.checkOut(id, user.sub, deviceId, dto);
  }
}
