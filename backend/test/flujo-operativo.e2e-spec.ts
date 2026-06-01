import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { NotificationLog } from '../src/modules/notifications/entities/notification-log.entity';
import { createTestApp, seedAdmin } from './helpers/e2e';

/**
 * Recorre el camino operativo completo: alta de datos, asignación, vinculación
 * y aprobación de dispositivo, y confirmación de llegada.
 */
describe('Flujo operativo completo (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let providerToken: string;
  let providerId: string;
  let patientId: string;
  let addressId: string;
  let serviceId: string;
  let assignmentId: string;
  let deviceRecordId: string;

  const deviceId = 'e2e-device-001';
  const providerEmail = 'laura.e2e@nareapp.local';
  const providerPassword = 'prestador-123';

  const auth = (token: string) => ['Authorization', `Bearer ${token}`] as const;

  beforeAll(async () => {
    app = await createTestApp();
    const admin = await seedAdmin(app);
    const res = await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('coordinación da de alta un prestador (sin exponer el hash)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/coordination/providers')
      .set(...auth(adminToken))
      .send({
        apellido: 'Gómez',
        nombre: 'Laura',
        tipoPrestador: 'enfermero',
        email: providerEmail,
        password: providerPassword,
      })
      .expect(201);
    providerId = res.body.id;
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.roles).toHaveLength(1);
  });

  it('coordinación da de alta una persona a cuidar con domicilio', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/coordination/patients')
      .set(...auth(adminToken))
      .send({
        apellido: 'Pérez',
        nombre: 'María',
        address: {
          calle: 'Av. Pellegrini 1234',
          ciudad: 'Rosario',
          provincia: 'Santa Fe',
          latitude: -32.9468,
          longitude: -60.6393,
        },
      })
      .expect(201);
    patientId = res.body.id;
    addressId = res.body.addresses[0].id;
  });

  it('coordinación crea un servicio y asigna al prestador', async () => {
    // El servicio debe estar en curso (ventana de fichaje): el anti-fraude
    // server-side rechaza un check-in horas antes del inicio. Arrancó hace un
    // rato y termina dentro de unas horas, así que "LLEGUÉ" ahora cae dentro
    // de la ventana [inicio - lead, fin + trail].
    const start = new Date(Date.now() - 5 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 3600 * 1000);
    const service = await request(app.getHttpServer())
      .post('/api/coordination/services')
      .set(...auth(adminToken))
      .send({
        patientId,
        addressId,
        fecha: start.toISOString().slice(0, 10),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
      .expect(201);
    serviceId = service.body.id;

    const assignment = await request(app.getHttpServer())
      .post('/api/coordination/assignments')
      .set(...auth(adminToken))
      .send({ serviceId, providerId })
      .expect(201);
    assignmentId = assignment.body.id;
    expect(assignment.body.status).toBe('pendiente');
  });

  it('el prestador inicia sesión en la app mobile', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: providerEmail, password: providerPassword })
      .expect(200);
    providerToken = res.body.accessToken;
    expect(res.body.provider.id).toBe(providerId);
  });

  it('el prestador registra su dispositivo y queda pendiente de aprobación', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/devices/register')
      .set(...auth(providerToken))
      .send({ deviceId, plataforma: 'android', modelo: 'Moto G' })
      .expect(201);
    deviceRecordId = res.body.id;
    expect(res.body.estado).toBe('pendiente');
  });

  it('con el dispositivo pendiente, los endpoints operativos devuelven 403', async () => {
    await request(app.getHttpServer())
      .get('/api/assignments/today')
      .set(...auth(providerToken))
      .set('X-Device-Id', deviceId)
      .expect(403);
  });

  it('coordinación aprueba el dispositivo y dispara push dispositivo_aprobado', async () => {
    await request(app.getHttpServer())
      .post(`/api/coordination/devices/${deviceRecordId}/approve`)
      .set(...auth(adminToken))
      .expect(201);

    const logsRepo = app.get(DataSource).getRepository(NotificationLog);
    const log = await logsRepo.findOne({
      where: { type: 'dispositivo_aprobado' },
      relations: { provider: true },
      order: { sentAt: 'DESC' },
    });
    expect(log).toBeTruthy();
    expect(log!.provider.id).toBe(providerId);
    // Sin credenciales FCM en .env.test, el envío queda como "simulado".
    expect(log!.status).toBe('simulado');
  });

  it('con el dispositivo aprobado, el prestador accede a sus servicios', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/assignments/today')
      .set(...auth(providerToken))
      .set('X-Device-Id', deviceId)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('el prestador confirma la llegada ("LLEGUÉ") dentro del radio', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/assignments/${assignmentId}/check-in`)
      .set(...auth(providerToken))
      .set('X-Device-Id', deviceId)
      .send({
        latitude: -32.9468,
        longitude: -60.6393,
        idempotencyKey: 'e2e-checkin-001',
      })
      .expect(201);
    expect(res.body.type).toBe('check_in');
    expect(res.body.insideAllowedRadius).toBe(true);
  });

  it('el check-in es idempotente: reenviar la misma clave no duplica', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/assignments/${assignmentId}/check-in`)
      .set(...auth(providerToken))
      .set('X-Device-Id', deviceId)
      .send({
        latitude: -32.9468,
        longitude: -60.6393,
        idempotencyKey: 'e2e-checkin-001',
      })
      .expect(201);
    expect(res.body.type).toBe('check_in');
  });

  it('tras el check-in, la asignación queda en estado en_servicio', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/coordination/assignments/${assignmentId}`)
      .set(...auth(adminToken))
      .expect(200);
    expect(res.body.status).toBe('en_servicio');
    expect(res.body.checkInAt).toBeTruthy();
  });
});
