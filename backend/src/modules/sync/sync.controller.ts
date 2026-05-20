import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProviderGuard } from '../../common/guards/provider.guard';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DeviceApprovedGuard } from '../devices/guards/device-approved.guard';
import { SyncEventsDto } from './dto/sync-events.dto';
import { SyncService } from './sync.service';

/** Sincronización de eventos offline desde la app mobile. */
@UseGuards(ProviderGuard, DeviceApprovedGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('events')
  syncEvents(
    @CurrentUser() user: JwtPayload,
    @Headers('x-device-id') deviceId: string,
    @Body() dto: SyncEventsDto,
  ) {
    return this.sync.processBatch(user.sub, deviceId, dto);
  }
}
