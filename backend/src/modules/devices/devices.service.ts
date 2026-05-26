import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { DeviceStatus } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Provider } from '../providers/entities/provider.entity';
import { CreateProviderDeviceDto } from './dto/create-provider-device.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateProviderDeviceDto } from './dto/update-provider-device.dto';
import { ProviderDevice } from './entities/provider-device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    private readonly notifications: NotificationsService,
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

  /**
   * Marca un dispositivo como reemplazado. Habilita una nueva activación por
   * QR (el dispositivo viejo deja de operar; el prestador activa otro teléfono).
   */
  replace(id: string, coordinatorId: string): Promise<ProviderDevice> {
    return this.decide(id, DeviceStatus.REEMPLAZADO, coordinatorId);
  }

  private async decide(
    id: string,
    estado: DeviceStatus,
    coordinatorId: string,
  ): Promise<ProviderDevice> {
    const device = await this.devices.findOne({
      where: { id },
      relations: { provider: true },
    });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
    device.estado = estado;
    if (estado === DeviceStatus.APROBADO) {
      device.activatedAt = new Date();
      device.revokedAt = null;
    }
    if (
      estado === DeviceStatus.REVOCADO ||
      estado === DeviceStatus.REEMPLAZADO
    ) {
      device.revokedAt = new Date();
    }
    device.approvedBy = coordinatorId;
    device.approvedAt = new Date();
    const saved = await this.devices.save(device);
    if (estado === DeviceStatus.APROBADO && device.provider) {
      await this.notifications.notifyProvider(
        device.provider.id,
        'dispositivo_aprobado',
        { deviceId: device.deviceId },
      );
    }
    return saved;
  }

  /** Da de alta un dispositivo desde el panel de coordinación. */
  async createByCoordination(
    dto: CreateProviderDeviceDto,
  ): Promise<ProviderDevice> {
    const provider = await this.providers.findOne({
      where: { id: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }
    return this.devices.save(
      this.devices.create({
        provider,
        deviceId: dto.deviceId,
        plataforma: dto.plataforma,
        modelo: dto.modelo,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        pushToken: dto.pushToken,
        estado: dto.estado ?? DeviceStatus.PENDIENTE,
      }),
    );
  }

  findAll(pagination: PaginationDto): Promise<ProviderDevice[]> {
    const { page, limit } = pagination;
    return this.devices.find({
      relations: { provider: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<ProviderDevice> {
    const device = await this.devices.findOne({
      where: { id },
      relations: { provider: true },
    });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
    return device;
  }

  /** Actualiza los datos de un dispositivo. */
  async update(
    id: string,
    dto: UpdateProviderDeviceDto,
  ): Promise<ProviderDevice> {
    const device = await this.devices.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
    // Si cambia `providerId`, se reasigna el dispositivo a otro prestador.
    if (dto.providerId) {
      const provider = await this.providers.findOne({
        where: { id: dto.providerId },
      });
      if (!provider) {
        throw new NotFoundException('Prestador no encontrado');
      }
      device.provider = provider;
    }
    this.devices.merge(device, {
      deviceId: dto.deviceId,
      plataforma: dto.plataforma,
      modelo: dto.modelo,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      pushToken: dto.pushToken,
      estado: dto.estado,
    });
    await this.devices.save(device);
    return this.findOne(id);
  }

  /** Elimina físicamente un dispositivo. */
  async remove(id: string): Promise<void> {
    const device = await this.devices.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
    try {
      await this.devices.delete(id);
    } catch (error) {
      // 23503 = foreign_key_violation: el dispositivo tiene eventos asociados.
      if (error instanceof QueryFailedError && (error as any).code === '23503') {
        throw new ConflictException(
          'No se puede eliminar el dispositivo: tiene eventos de asistencia o ubicación asociados',
        );
      }
      throw error;
    }
  }
}
