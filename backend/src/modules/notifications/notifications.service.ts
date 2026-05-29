import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as admin from 'firebase-admin';
import { Repository } from 'typeorm';
import { DeviceStatus } from '../../common/enums';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { NotificationLog } from './entities/notification-log.entity';

/** Códigos de error de FCM que indican que el token ya no es válido. */
const FCM_INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Mapea cada tipo operativo a título/cuerpo legibles. Esto va al campo
 * `notification` de FCM, que es lo que Android usa para mostrar el banner
 * automáticamente cuando la app está en background. El campo `data` se
 * sigue mandando con el payload estructurado para el procesamiento interno.
 */
function renderNotification(
  type: string,
  payload: Record<string, unknown>,
): { title: string; body: string } | null {
  switch (type) {
    case 'dispositivo_aprobado':
      return {
        title: 'Dispositivo habilitado',
        body: 'Coordinación aprobó tu dispositivo. Ya podés operar normalmente.',
      };
    case 'cambio_asignacion':
      return {
        title: 'Cambio en tu agenda',
        body: 'Hay una novedad en tus servicios. Revisá la app.',
      };
    case 'solicitud_fin_servicio':
      return {
        title: 'Solicitud de fin de servicio',
        body:
          typeof payload.notes === 'string' && payload.notes
            ? `Coordinación: ${payload.notes}`
            : 'Coordinación te pide que finalices el servicio en curso.',
      };
    case 'recordatorio_servicio':
      return {
        title: 'Próximo servicio',
        body: 'Tu próximo servicio comienza en breve.',
      };
    case 'alerta_riesgo':
      return {
        title: 'Alerta de servicio',
        body: 'Hay una alerta operativa en tu servicio. Revisá la app.',
      };
    default:
      return null;
  }
}

/**
 * Envío de notificaciones push a los prestadores via Firebase Cloud Messaging.
 *
 * - Si las credenciales del service account no están configuradas
 *   (`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`), opera en
 *   modo simulado: registra la notificación pero no llama a Firebase.
 * - Cuando FCM responde que el token ya no está registrado, el `pushToken`
 *   del dispositivo se borra y, si el device estaba `APROBADO`, se marca
 *   como `REVOCADO`.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly fcmApp: admin.app.App | null;

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logs: Repository<NotificationLog>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    config: ConfigService,
  ) {
    this.fcmApp = this.initFcm(config);
  }

  /** Inicializa firebase-admin si hay credenciales completas; si no, null. */
  private initFcm(config: ConfigService): admin.app.App | null {
    const projectId = config.get<string>('fcm.projectId');
    const clientEmail = config.get<string>('fcm.clientEmail');
    const privateKey = config.get<string>('fcm.privateKey');
    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }
    // Reutiliza la app por defecto si otra parte del proceso ya la inicializó.
    if (admin.apps.length > 0 && admin.apps[0]) {
      return admin.apps[0];
    }
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
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

  /**
   * Envía una notificación push al prestador a través de todos sus
   * dispositivos aprobados con `pushToken` activo, y registra la operación.
   * Si FCM no está configurado, queda como "simulado" en el log.
   */
  async notifyProvider(
    providerId: string,
    type: string,
    payload: Record<string, unknown>,
    assignmentId?: string,
  ): Promise<void> {
    const targets = this.fcmApp
      ? await this.devices.find({
          where: {
            provider: { id: providerId },
            estado: DeviceStatus.APROBADO,
          },
        })
      : [];

    const withToken = targets.filter((d) => Boolean(d.pushToken));
    const status = this.fcmApp
      ? withToken.length > 0
        ? 'enviado'
        : 'sin_token'
      : 'simulado';

    await this.logs.save(
      this.logs.create({
        provider: { id: providerId },
        assignment: assignmentId ? { id: assignmentId } : undefined,
        type,
        channel: 'fcm',
        payload,
        status,
        sentAt: new Date(),
      }),
    );

    if (!this.fcmApp) {
      this.logger.log(`[push:simulado] ${type} -> prestador ${providerId}`);
      return;
    }
    if (withToken.length === 0) {
      this.logger.warn(
        `[push] sin pushToken activo para prestador ${providerId} (${type})`,
      );
      return;
    }

    await Promise.all(
      withToken.map((device) => this.sendToDevice(device, type, payload)),
    );
  }

  /**
   * Envía a un dispositivo concreto. Captura errores de token inválido y
   * revoca el `pushToken` (y el device, si estaba aprobado).
   */
  private async sendToDevice(
    device: ProviderDevice,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.fcmApp || !device.pushToken) return;
    const notification = renderNotification(type, payload);
    try {
      await this.fcmApp.messaging().send({
        token: device.pushToken,
        ...(notification ? { notification } : {}),
        data: {
          type,
          // FCM data payloads deben ser strings.
          payload: JSON.stringify(payload),
        },
        android: {
          priority: 'high',
          notification: {
            // Coincide con el canal creado por mobile en push_service.dart
            // (`kPushChannelId`). Sin este id Android usa un canal default de
            // baja importancia y la notif no aparece como heads-up.
            channelId: 'nareapp_pushes',
            sound: 'default',
            defaultSound: true,
            visibility: 'public',
          },
        },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      if (FCM_INVALID_TOKEN_ERRORS.has(code)) {
        this.logger.warn(
          `[push] token inválido para device ${device.id} (${code}); revocando`,
        );
        device.pushToken = null;
        if (device.estado === DeviceStatus.APROBADO) {
          device.estado = DeviceStatus.REVOCADO;
          device.revokedAt = new Date();
        }
        await this.devices.save(device);
        return;
      }
      this.logger.error(
        `[push] error enviando ${type} a device ${device.id}: ${
          (error as Error).message
        }`,
      );
    }
  }
}
