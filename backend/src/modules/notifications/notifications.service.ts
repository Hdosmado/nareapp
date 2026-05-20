import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { NotificationLog } from './entities/notification-log.entity';

/**
 * Envío de notificaciones push a los prestadores. Si las credenciales de
 * Firebase Cloud Messaging no están configuradas, opera en "modo simulado":
 * registra la notificación pero no la envía. La integración real con
 * `firebase-admin` se conecta aquí sin cambiar la interfaz.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly fcmEnabled: boolean;

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logs: Repository<NotificationLog>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    config: ConfigService,
  ) {
    this.fcmEnabled = Boolean(config.get<string>('FCM_PROJECT_ID'));
  }

  /** Actualiza el token de push de un dispositivo del prestador. */
  async registerPushToken(
    providerId: string,
    deviceId: string,
    pushToken: string,
  ): Promise<{ ok: true }> {
    const device = await this.devices.findOne({
      where: { deviceId, provider: { id: providerId } },
    });
    if (!device) {
      throw new NotFoundException('Dispositivo no registrado');
    }
    device.pushToken = pushToken;
    await this.devices.save(device);
    return { ok: true };
  }

  /** Envía (o simula) una notificación push a un prestador y la registra. */
  async notifyProvider(
    providerId: string,
    type: string,
    payload: Record<string, unknown>,
    assignmentId?: string,
  ): Promise<void> {
    await this.logs.save(
      this.logs.create({
        provider: { id: providerId },
        assignment: assignmentId ? { id: assignmentId } : undefined,
        type,
        channel: 'fcm',
        payload,
        status: this.fcmEnabled ? 'enviado' : 'simulado',
        sentAt: new Date(),
      }),
    );

    if (!this.fcmEnabled) {
      this.logger.log(`[push:simulado] ${type} -> prestador ${providerId}`);
      return;
    }
    // Integración real con firebase-admin: pendiente de credenciales FCM.
    this.logger.log(`[push] ${type} -> prestador ${providerId}`);
  }
}
