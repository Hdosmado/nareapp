import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentStatus, AttendanceType, RiskLevel } from '../../common/enums';
import { distanceMeters } from '../../common/geo/geo.util';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEvent)
    private readonly events: Repository<AttendanceEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
  ) {}

  /** Registra la llegada del prestador al domicilio ("LLEGUÉ"). */
  async checkIn(
    assignmentId: string,
    providerId: string,
    deviceId: string | undefined,
    dto: CheckInDto,
  ): Promise<AttendanceEvent> {
    const existing = await this.events.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const assignment = await this.loadOwnedAssignment(assignmentId, providerId);
    const device = await this.resolveDevice(deviceId, providerId);

    const address = assignment.address;
    let distance: number | undefined;
    let inside: boolean | undefined;
    if (address?.latitude != null && address?.longitude != null) {
      distance = distanceMeters(
        dto.latitude,
        dto.longitude,
        address.latitude,
        address.longitude,
      );
      inside = distance <= address.allowedRadiusM;
    }

    const event = await this.events.save(
      this.events.create({
        assignment,
        provider: assignment.provider ?? undefined,
        device,
        type: AttendanceType.CHECK_IN,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        distanceToAddress: distance,
        insideAllowedRadius: inside,
        timestampLocal: dto.timestampLocal
          ? new Date(dto.timestampLocal)
          : undefined,
        timestampServer: new Date(),
        exceptionReason: dto.exceptionReason,
        idempotencyKey: dto.idempotencyKey,
      }),
    );

    assignment.status = AssignmentStatus.EN_SERVICIO;
    assignment.checkInAt = event.timestampServer;
    assignment.riskLevel = RiskLevel.VERDE;
    await this.assignments.save(assignment);

    return event;
  }

  /** Registra el fin del servicio y detiene el seguimiento operativo. */
  async checkOut(
    assignmentId: string,
    providerId: string,
    deviceId: string | undefined,
    dto: CheckOutDto,
  ): Promise<AttendanceEvent> {
    const existing = await this.events.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const assignment = await this.loadOwnedAssignment(assignmentId, providerId);
    const device = await this.resolveDevice(deviceId, providerId);

    const now = new Date();

    // El mobile decide si el cierre es temprano (umbral adaptativo proporcional
    // al largo del turno, configurable en app_config) y, de serlo, ofrece
    // registrar un motivo. El backend no recalcula el umbral: confía en el
    // motivo que llega. Así el control funciona también en turnos cortos y no
    // depende de la hora de reenvío en el path offline.
    const earlyCheckoutReason = dto.earlyCheckoutReason?.trim() || null;

    const event = await this.events.save(
      this.events.create({
        assignment,
        provider: assignment.provider ?? undefined,
        device,
        type: AttendanceType.CHECK_OUT,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        timestampLocal: dto.timestampLocal
          ? new Date(dto.timestampLocal)
          : undefined,
        timestampServer: now,
        earlyCheckoutReason,
        idempotencyKey: dto.idempotencyKey,
      }),
    );

    assignment.status = AssignmentStatus.FINALIZADO;
    assignment.checkOutAt = event.timestampServer;
    assignment.earlyCheckout = earlyCheckoutReason !== null;
    await this.assignments.save(assignment);

    return event;
  }

  private async loadOwnedAssignment(
    assignmentId: string,
    providerId: string,
  ): Promise<ServiceAssignment> {
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
      relations: { address: true, provider: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (assignment.provider?.id !== providerId) {
      throw new ForbiddenException('La asignación no corresponde al prestador');
    }
    return assignment;
  }

  private async resolveDevice(
    deviceId: string | undefined,
    providerId: string,
  ): Promise<ProviderDevice | undefined> {
    if (!deviceId) {
      return undefined;
    }
    const device = await this.devices.findOne({
      where: { deviceId, provider: { id: providerId } },
    });
    return device ?? undefined;
  }
}
