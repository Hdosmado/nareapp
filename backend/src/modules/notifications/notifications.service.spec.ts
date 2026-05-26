import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceStatus, DevicePlatform } from '../../common/enums';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationsService } from './notifications.service';

// firebase-admin se mockea por completo para no tocar credenciales reales.
const sendMock = jest.fn();
jest.mock('firebase-admin', () => ({
  apps: [] as unknown[],
  initializeApp: jest.fn().mockImplementation(() => ({
    messaging: () => ({ send: sendMock }),
  })),
  credential: { cert: jest.fn() },
}));

type DeviceRow = Partial<ProviderDevice> & { id: string };

function buildDevice(overrides: Partial<DeviceRow> = {}): DeviceRow {
  return {
    id: 'device-1',
    deviceId: 'phone-1',
    plataforma: DevicePlatform.ANDROID,
    pushToken: 'fcm-token-1',
    estado: DeviceStatus.APROBADO,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let logsRepo: jest.Mocked<Repository<NotificationLog>>;
  let devicesRepo: jest.Mocked<Repository<ProviderDevice>>;

  beforeEach(() => {
    sendMock.mockReset();
    logsRepo = {
      create: jest.fn((x) => x as NotificationLog),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationLog>>;
    devicesRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((x) => Promise.resolve(x as ProviderDevice)),
    } as unknown as jest.Mocked<Repository<ProviderDevice>>;
  });

  async function buildService(
    overrides: Partial<Record<'projectId' | 'clientEmail' | 'privateKey', string>>,
  ): Promise<NotificationsService> {
    const cfg = {
      get: (key: string) =>
        ({
          'fcm.projectId': overrides.projectId ?? '',
          'fcm.clientEmail': overrides.clientEmail ?? '',
          'fcm.privateKey': overrides.privateKey ?? '',
        })[key] ?? '',
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(NotificationLog), useValue: logsRepo },
        { provide: getRepositoryToken(ProviderDevice), useValue: devicesRepo },
        { provide: ConfigService, useValue: cfg },
      ],
    }).compile();

    return moduleRef.get(NotificationsService);
  }

  describe('modo simulado (sin credenciales)', () => {
    it('registra el log con status="simulado" y no llama a FCM', async () => {
      const service = await buildService({});
      await service.notifyProvider('prov-1', 'dispositivo_aprobado', { foo: 1 });
      expect(logsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'simulado',
          type: 'dispositivo_aprobado',
        }),
      );
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe('FCM habilitado', () => {
    const creds = {
      projectId: 'p',
      clientEmail: 'e@e',
      privateKey: 'k',
    };

    it('envía al token del device APROBADO y registra status="enviado"', async () => {
      devicesRepo.find.mockResolvedValue([buildDevice() as ProviderDevice]);
      sendMock.mockResolvedValue('msg-id');

      const service = await buildService(creds);
      await service.notifyProvider('prov-1', 'alerta_riesgo', { x: true });

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'fcm-token-1',
          data: expect.objectContaining({ type: 'alerta_riesgo' }),
        }),
      );
      expect(logsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'enviado' }),
      );
      expect(devicesRepo.save).not.toHaveBeenCalled();
    });

    it('si el prestador no tiene devices con pushToken, log "sin_token" y no envía', async () => {
      devicesRepo.find.mockResolvedValue([
        buildDevice({ pushToken: null }) as ProviderDevice,
      ]);

      const service = await buildService(creds);
      await service.notifyProvider('prov-1', 'recordatorio_servicio', {});

      expect(sendMock).not.toHaveBeenCalled();
      expect(logsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'sin_token' }),
      );
    });

    it('ante token no registrado limpia pushToken y revoca el device', async () => {
      const device = buildDevice() as ProviderDevice;
      devicesRepo.find.mockResolvedValue([device]);
      sendMock.mockRejectedValue({
        code: 'messaging/registration-token-not-registered',
      });

      const service = await buildService(creds);
      await service.notifyProvider('prov-1', 'cambio_asignacion', {});

      expect(devicesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: device.id,
          pushToken: null,
          estado: DeviceStatus.REVOCADO,
        }),
      );
    });

    it('ante error genérico de FCM no revoca el device', async () => {
      const device = buildDevice() as ProviderDevice;
      devicesRepo.find.mockResolvedValue([device]);
      sendMock.mockRejectedValue({ code: 'messaging/internal-error' });

      const service = await buildService(creds);
      await service.notifyProvider('prov-1', 'alerta_riesgo', {});

      expect(devicesRepo.save).not.toHaveBeenCalled();
    });
  });
});
