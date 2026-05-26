import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/e2e';

/**
 * Healthcheck público: debe responder 200 sin autenticación. Es lo que
 * usan los healthchecks de Docker/Kubernetes/load balancers.
 */
describe('GET /api/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 sin token y reporta status="ok"', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });
});
