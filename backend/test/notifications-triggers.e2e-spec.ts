import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { NotificationLog } from '../src/modules/notifications/entities/notification-log.entity';
import { ServiceAssignment } from '../src/modules/services/entities/service-assignment.entity';
import { ServiceRemindersService } from '../src/modules/services/service-reminders.service';
import { createTestApp, seedAdmin } from './helpers/e2e';

/**
 * Disparadores restantes del Bloqueante 2 cuya cobertura no estaba en
 * `flujo-operativo.e2e-spec.ts`:
 *
 * - `solicitud_fin_servicio` via `POST /coordination/services/:id/request-end-service`.
 * - `recordatorio_servicio` via el scheduler `ServiceRemindersService` (se
 *   invoca el método `scan()` directamente para no depender del cron).
 */
describe('Disparadores de notificación (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let providerId: string;
  let patientId: string;
  let addressId: string;

  const auth = (token: string) => ['Authorization', `Bearer ${token}`] as const;

  async function crearAsignacion(startTime: Date): Promise<string> {
    const endTime = new Date(startTime.getTime() + 4 * 3600 * 1000);
    const service = await request(app.getHttpServer())
      .post('/api/coordination/services')
      .set(...auth(adminToken))
      .send({
        patientId,
        addressId,
        fecha: startTime.toISOString().slice(0, 10),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      .expect(201);

    const assignment = await request(app.getHttpServer())
      .post('/api/coordination/assignments')
      .set(...auth(adminToken))
      .send({ serviceId: service.body.id, providerId })
      .expect(201);
    return assignment.body.id;
  }

  beforeAll(async () => {
    app = await createTestApp();
    const admin = await seedAdmin(app);
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = loginRes.body.accessToken;

    const provider = await request(app.getHttpServer())
      .post('/api/coordination/providers')
      .set(...auth(adminToken))
      .send({
        apellido: 'Trigger',
        nombre: 'Test',
        tipoPrestador: 'enfermero',
        email: 'trigger-e2e@nareapp.local',
        password: 'trigger-e2e-123',
      })
      .expect(201);
    providerId = provider.body.id;

    const patient = await request(app.getHttpServer())
      .post('/api/coordination/patients')
      .set(...auth(adminToken))
      .send({
        apellido: 'Trigger',
        nombre: 'María',
        address: {
          calle: 'Av. Trigger 1',
          ciudad: 'Rosario',
          provincia: 'Santa Fe',
          latitude: -32.9468,
          longitude: -60.6393,
        },
      })
      .expect(201);
    patientId = patient.body.id;
    addressId = patient.body.addresses[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /coordination/services/:id/request-end-service', () => {
    it('dispara solicitud_fin_servicio al prestador asignado', async () => {
      const startTime = new Date(Date.now() + 24 * 3600 * 1000);
      const assignmentId = await crearAsignacion(startTime);

      await request(app.getHttpServer())
        .post(
          `/api/coordination/services/${assignmentId}/request-end-service`,
        )
        .set(...auth(adminToken))
        .send({ notes: 'Por favor cerrar el servicio' })
        .expect(201);

      const logsRepo = app.get(DataSource).getRepository(NotificationLog);
      const log = await logsRepo.findOne({
        where: { type: 'solicitud_fin_servicio' },
        relations: { provider: true, assignment: true },
        order: { sentAt: 'DESC' },
      });
      expect(log).toBeTruthy();
      expect(log!.provider.id).toBe(providerId);
      expect(log!.assignment.id).toBe(assignmentId);
    });
  });

  describe('ServiceRemindersService.scan()', () => {
    it('dispara recordatorio_servicio para servicios ~60min adelante y deja reminderSentAt', async () => {
      // Asignación que entra en la ventana del recordatorio (~60min).
      const inSixtyMinutes = new Date(Date.now() + 60 * 60 * 1000);
      const dueId = await crearAsignacion(inSixtyMinutes);

      // Asignación bien lejos en el tiempo: no debe disparar.
      const inFiveHours = new Date(Date.now() + 5 * 3600 * 1000);
      const notDueId = await crearAsignacion(inFiveHours);

      const reminders = app.get(ServiceRemindersService);
      const sent = await reminders.scan();
      expect(sent).toBeGreaterThanOrEqual(1);

      const logsRepo = app.get(DataSource).getRepository(NotificationLog);
      const logs = await logsRepo.find({
        where: { type: 'recordatorio_servicio' },
        relations: { provider: true, assignment: true },
        order: { sentAt: 'DESC' },
      });
      const dueLog = logs.find((l) => l.assignment.id === dueId);
      const notDueLog = logs.find((l) => l.assignment.id === notDueId);
      expect(dueLog).toBeTruthy();
      expect(dueLog!.provider.id).toBe(providerId);
      expect(notDueLog).toBeUndefined();

      // Idempotencia: una segunda corrida no reenvía.
      const sentAgain = await reminders.scan();
      expect(sentAgain).toBe(0);

      const assignmentsRepo = app
        .get(DataSource)
        .getRepository(ServiceAssignment);
      const persisted = await assignmentsRepo.findOne({
        where: { id: dueId },
      });
      expect(persisted?.reminderSentAt).toBeTruthy();
    });
  });
});
