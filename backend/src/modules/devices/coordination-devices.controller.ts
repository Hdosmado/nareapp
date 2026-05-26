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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateProviderDeviceDto } from './dto/create-provider-device.dto';
import { UpdateProviderDeviceDto } from './dto/update-provider-device.dto';
import { DevicesService } from './devices.service';

/** ABM y aprobación de dispositivos desde el panel de coordinación. */
@Roles(UserRole.COORDINADOR, UserRole.ADMIN)
@Controller('coordination/devices')
export class CoordinationDevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  create(@Body() dto: CreateProviderDeviceDto) {
    return this.devices.createByCoordination(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.devices.findAll(pagination);
  }

  /** Lista los dispositivos pendientes de aprobación. */
  // Ruta estática: declarada antes de ':id' para que no sea capturada como id.
  @Get('pending')
  pending() {
    return this.devices.listPending();
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.devices.findOne(id);
  }

  @Post(':id/approve')
  approve(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.approve(id, user.sub);
  }

  @Post(':id/reject')
  reject(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.reject(id, user.sub);
  }

  @Post(':id/revoke')
  revoke(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.revoke(id, user.sub);
  }

  /** Marca el dispositivo como reemplazado: habilita una nueva activación. */
  @Post(':id/replace')
  replace(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.devices.replace(id, user.sub);
  }

  @Patch(':id')
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateProviderDeviceDto) {
    return this.devices.update(id, dto);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto) {
    return this.devices.remove(id);
  }
}
