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
import { PreServiceLocationDto } from './dto/pre-service-location.dto';
import { TrackingService } from './tracking.service';

/** Recepción de ubicaciones de la ventana de tracking previa al servicio. */
@UseGuards(ProviderGuard, DeviceApprovedGuard)
@Controller('assignments')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post(':id/pre-service-location')
  record(
    @Param() { id }: IdParamDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: PreServiceLocationDto,
  ) {
    return this.tracking.recordLocation(id, user.sub, deviceId, dto);
  }
}
