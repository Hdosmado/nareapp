import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectivityStatus } from '../../common/enums';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationDto } from './dto/pre-service-location.dto';
import { PreServiceLocationEvent } from './entities/pre-service-location-event.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(PreServiceLocationEvent)
    private readonly events: Repository<PreServiceLocationEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
  ) {}

  /** Registra un punto de ubicación previo al inicio del servicio. */
  async recordLocation(
    assignmentId: string,
    providerId: string,
    deviceId: string | undefined,
    dto: PreServiceLocationDto,
  ): Promise<PreServiceLocationEvent> {
    const existing = await this.events.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
      relations: { provider: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (assignment.provider?.id !== providerId) {
      throw new ForbiddenException('La asignación no corresponde al prestador');
    }

    let device: ProviderDevice | undefined;
    if (deviceId) {
      device =
        (await this.devices.findOne({
          where: { deviceId, provider: { id: providerId } },
        })) ?? undefined;
    }

    return this.events.save(
      this.events.create({
        assignment,
        provider: assignment.provider ?? undefined,
        device,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        batteryLevel: dto.batteryLevel,
        connectivityStatus: dto.connectivityStatus ?? ConnectivityStatus.UNKNOWN,
        origin: 'pre_servicio_tracking',
        timestampLocal: dto.timestampLocal
          ? new Date(dto.timestampLocal)
          : undefined,
        timestampServer: new Date(),
        idempotencyKey: dto.idempotencyKey,
      }),
    );
  }
}
