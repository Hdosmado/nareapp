import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStatus } from '../../common/enums';
import { Provider } from '../providers/entities/provider.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { ProviderDevice } from './entities/provider-device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
  ) {}

  /** Registra o actualiza el dispositivo de un prestador. Queda pendiente. */
  async register(
    providerId: string,
    dto: RegisterDeviceDto,
  ): Promise<ProviderDevice> {
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    let device = await this.devices.findOne({
      where: { deviceId: dto.deviceId, provider: { id: providerId } },
    });

    if (device) {
      device.plataforma = dto.plataforma;
      device.modelo = dto.modelo ?? device.modelo;
      device.osVersion = dto.osVersion ?? device.osVersion;
      device.appVersion = dto.appVersion ?? device.appVersion;
      device.pushToken = dto.pushToken ?? device.pushToken;
      if (
        device.estado === DeviceStatus.REVOCADO ||
        device.estado === DeviceStatus.RECHAZADO
      ) {
        device.estado = DeviceStatus.PENDIENTE;
      }
    } else {
      device = this.devices.create({
        provider,
        deviceId: dto.deviceId,
        plataforma: dto.plataforma,
        modelo: dto.modelo,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        pushToken: dto.pushToken,
        estado: DeviceStatus.PENDIENTE,
      });
    }
    return this.devices.save(device);
  }

  /** Estado de aprobación de un dispositivo del prestador. */
  async getStatus(
    providerId: string,
    deviceId: string,
  ): Promise<{ estado: DeviceStatus }> {
    const device = await this.devices.findOne({
      where: { deviceId, provider: { id: providerId } },
    });
    if (!device) {
      throw new NotFoundException('Dispositivo no registrado');
    }
    return { estado: device.estado };
  }

  /** Dispositivos pendientes de aprobación, para el panel de coordinación. */
  listPending(): Promise<ProviderDevice[]> {
    return this.devices.find({
      where: { estado: DeviceStatus.PENDIENTE },
      relations: { provider: true },
      order: { createdAt: 'ASC' },
    });
  }

  approve(id: string, coordinatorId: string): Promise<ProviderDevice> {
    return this.decide(id, DeviceStatus.APROBADO, coordinatorId);
  }

  reject(id: string, coordinatorId: string): Promise<ProviderDevice> {
    return this.decide(id, DeviceStatus.RECHAZADO, coordinatorId);
  }

  revoke(id: string, coordinatorId: string): Promise<ProviderDevice> {
    return this.decide(id, DeviceStatus.REVOCADO, coordinatorId);
  }

  private async decide(
    id: string,
    estado: DeviceStatus,
    coordinatorId: string,
  ): Promise<ProviderDevice> {
    const device = await this.devices.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
    device.estado = estado;
    device.approvedBy = coordinatorId;
    device.approvedAt = new Date();
    return this.devices.save(device);
  }
}
