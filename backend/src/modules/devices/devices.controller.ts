import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProviderGuard } from '../../common/guards/provider.guard';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

/** Endpoints de gestión de dispositivo usados por la app mobile. */
@UseGuards(ProviderGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  /** Registra (o re-registra) el dispositivo del prestador. */
  @Post('register')
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user.sub, dto);
  }

  /** Consulta el estado de aprobación de un dispositivo. */
  @Get('status')
  status(@CurrentUser() user: JwtPayload, @Query('deviceId') deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException('Falta el parámetro deviceId');
    }
    return this.devices.getStatus(user.sub, deviceId);
  }
}
