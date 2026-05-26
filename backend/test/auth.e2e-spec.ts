import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin } from './helpers/e2e';

describe('Autenticación (e2e)', () => {
  let app: INestApplication;
  let admin: { email: string; password: string };

  beforeAll(async () => {
    app = await createTestApp();
    admin = await seedAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('login del panel con credenciales válidas devuelve tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.rol).toBe('admin');
  });

  it('login con contraseña incorrecta devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: admin.email, password: 'contraseña-incorrecta' })
      .expect(401);
  });

  it('login con email mal formado devuelve 400 (validación)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: 'no-es-email', password: 'algo123' })
      .expect(400);
  });

  it('un endpoint protegido sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .get('/api/coordination/dashboard')
      .expect(401);
  });

  it('refresh con un token mal formado devuelve 400 (validación)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'no-es-jwt' })
      .expect(400);
  });
});
