import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStatus } from '../../../common/enums';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { ProviderDevice } from '../entities/provider-device.entity';

/**
 * Bloquea los endpoints operativos si el dispositivo del prestador no está
 * aprobado. La app mobile identifica su dispositivo con el header `X-Device-Id`.
 */
@Injectable()
export class DeviceApprovedGuard implements CanActivate {
  constructor(
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      headers: Record<string, string | undefined>;
    }>();
    const user = request.user;

    if (!user || user.type !== 'provider') {
      throw new ForbiddenException('Recurso exclusivo de prestadores');
    }

    const deviceId = request.headers['x-device-id'];
    if (!deviceId) {
      throw new ForbiddenException('Falta el identificador de dispositivo');
    }

    // Binding fuerte: si la sesión trae el claim `deviceId` (las sesiones
    // activadas por QR lo setean), el header X-Device-Id DEBE coincidir. Así un
    // atacante no puede reutilizar el token de un prestador declarando otro
    // dispositivo. Si el claim no está (login por password), no se exige.
    if (user.deviceId && user.deviceId !== deviceId) {
      throw new ForbiddenException(
        'El dispositivo no coincide con la sesión activada.',
      );
    }

    const device = await this.devices.findOne({
      where: { deviceId, provider: { id: user.sub } },
    });

    if (!device || device.estado !== DeviceStatus.APROBADO) {
      throw new ForbiddenException({
        code: 'DEVICE_NOT_APPROVED',
        message:
          'Tu dispositivo está pendiente de aprobación por coordinación.',
      });
    }
    return true;
  }
}
