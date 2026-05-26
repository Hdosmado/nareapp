import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DeviceActivationToken } from '../src/modules/devices/entities/device-activation-token.entity';
import { createTestApp, seedAdmin } from './helpers/e2e';

/**
 * Verifica el flujo de activación de dispositivos por código corto:
 * generación desde el panel, reclamo por código y por QR, y todas las rutas
 * de fallo (código inválido, vencido, revocado, doble uso, conflicto de
 * dispositivo, revocación por intentos fallidos y rate limiting).
 */
describe('Activación de dispositivos por código (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let providerSeq = 0;

  const auth = (token: string) =>
    ['Authorization', `Bearer ${token}`] as const;

  /** Crea un prestador desde el panel y devuelve su id. */
  const createProvider = async (): Promise<string> => {
    providerSeq += 1;
    const res = await request(app.getHttpServer())
      .post('/api/coordination/providers')
      .set(...auth(adminToken))
      .send({
        apellido: 'Activación',
        nombre: `Prestador ${providerSeq}`,
        tipoPrestador: 'enfermero',
        email: `activacion.${providerSeq}@nareapp.local`,
        password: 'prestador-e2e-123',
      })
      .expect(201);
    return res.body.id;
  };

  /** Genera una activación para un prestador y devuelve la respuesta. */
  const generate = async (providerId: string) => {
    const res = await request(app.getHttpServer())
      .post(`/api/coordination/providers/${providerId}/activation`)
      .set(...auth(adminToken))
      .expect(200);
    return res.body as {
      tokenId: string;
      activationCode: string;
      activationCodeFormatted: string;
      qrUrl: string;
      expiresAt: string;
      whatsappMessage: string;
    };
  };

  /** Reclama una activación desde la app (endpoint público). */
  const claim = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/mobile/activation/claim').send(body);

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

  it('genera una activación con código de 8 dígitos, QR y mensaje de WhatsApp', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);

    expect(act.tokenId).toBeDefined();
    expect(act.activationCode).toMatch(/^\d{8}$/);
    expect(act.activationCodeFormatted).toMatch(/^\d{4}-\d{4}$/);
    expect(act.qrUrl).toContain('token=');
    expect(new Date(act.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(act.whatsappMessage).toContain(act.activationCodeFormatted);
  });

  it('reclama la activación con el código y abre sesión APROBADA', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);

    const res = await claim({
      activationCode: act.activationCode,
      deviceId: 'dev-claim-codigo',
      platform: 'android',
    }).expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.provider.id).toBe(providerId);
    expect(res.body.device.status).toBe('active');
  });

  it('acepta el código tipeado con guiones', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);

    await claim({
      activationCode: act.activationCodeFormatted,
      deviceId: 'dev-claim-guiones',
      platform: 'android',
    }).expect(200);
  });

  it('reclama la activación con el token del QR', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);
    const token = new URL(act.qrUrl).searchParams.get('token');

    const res = await claim({
      activationToken: token,
      deviceId: 'dev-claim-qr',
      platform: 'ios',
    }).expect(200);

    expect(res.body.provider.id).toBe(providerId);
  });

  it('rechaza un código inexistente con 400', async () => {
    await claim({
      activationCode: '00000000',
      deviceId: 'dev-inexistente',
      platform: 'android',
    }).expect(400);
  });

  it('rechaza un cuerpo vacío y un cuerpo sin código ni QR con 400', async () => {
    await claim({}).expect(400);
    await claim({ deviceId: 'dev-sin-credencial', platform: 'android' }).expect(
      400,
    );
  });

  it('rechaza el segundo uso del mismo código (un solo uso)', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);

    await claim({
      activationCode: act.activationCode,
      deviceId: 'dev-doble-uso',
      platform: 'android',
    }).expect(200);

    await claim({
      activationCode: act.activationCode,
      deviceId: 'dev-doble-uso',
      platform: 'android',
    }).expect(400);
  });

  it('rechaza un código revocado por coordinación con 400', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);

    await request(app.getHttpServer())
      .post(`/api/coordination/providers/${providerId}/activation/revoke`)
      .set(...auth(adminToken))
      .expect(200);

    await claim({
      activationCode: act.activationCode,
      deviceId: 'dev-revocado',
      platform: 'android',
    }).expect(400);
  });

  it('rechaza un código vencido con 400', async () => {
    const providerId = await createProvider();
    const act = await generate(providerId);

    // Adelanta el vencimiento al pasado: el proyecto usa synchronize, no hay
    // forma de "esperar" 24h, así que se manipula la fila directamente.
    await app
      .get(DataSource)
      .getRepository(DeviceActivationToken)
      .update(act.tokenId, { expiresAt: new Date(Date.now() - 1000) });

    await claim({
      activationCode: act.activationCode,
      deviceId: 'dev-vencido',
      platform: 'android',
    }).expect(400);
  });

  it('rechaza el reclamo si el dispositivo ya está vinculado a otro prestador (409)', async () => {
    const providerA = await createProvider();
    const actA = await generate(providerA);
    await claim({
      activationCode: actA.activationCode,
      deviceId: 'dev-compartido',
      platform: 'android',
    }).expect(200);

    const providerB = await createProvider();
    const actB = await generate(providerB);
    await claim({
      activationCode: actB.activationCode,
      deviceId: 'dev-compartido',
      platform: 'android',
    }).expect(409);
  });

  it('revoca el token tras alcanzar el umbral de intentos fallidos', async () => {
    // Dispositivo ya vinculado a otro prestador: cada reclamo contra él falla.
    const owner = await createProvider();
    const actOwner = await generate(owner);
    await claim({
      activationCode: actOwner.activationCode,
      deviceId: 'dev-umbral',
      platform: 'android',
    }).expect(200);

    const providerId = await createProvider();
    const act = await generate(providerId);

    // 5 intentos fallidos por conflicto de dispositivo (umbral configurado).
    for (let i = 0; i < 5; i++) {
      await claim({
        activationCode: act.activationCode,
        deviceId: 'dev-umbral',
        platform: 'android',
      }).expect(409);
    }

    // El token quedó revocado: ya ni siquiera llega a evaluar el conflicto.
    await claim({
      activationCode: act.activationCode,
      deviceId: 'dev-umbral-limpio',
      platform: 'android',
    }).expect(400);
  });

  it('permite reactivar: generar un código nuevo y vincular otro teléfono', async () => {
    const providerId = await createProvider();

    const first = await generate(providerId);
    await claim({
      activationCode: first.activationCode,
      deviceId: 'dev-reactivacion-1',
      platform: 'android',
    }).expect(200);

    // Reemplazo de teléfono: misma vía, sin alta.
    const second = await generate(providerId);
    const res = await claim({
      activationCode: second.activationCode,
      deviceId: 'dev-reactivacion-2',
      platform: 'android',
    }).expect(200);
    expect(res.body.provider.id).toBe(providerId);
  });

  // Debe ser el último test: consume el presupuesto de rate limiting por IP.
  it('aplica rate limiting por IP en el endpoint de reclamo (429)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 60; i++) {
      const res = await claim({
        activationCode: '99999999',
        deviceId: `dev-rate-${i}`,
        platform: 'android',
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
