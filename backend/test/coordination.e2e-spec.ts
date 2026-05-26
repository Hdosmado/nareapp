import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { argentinaDayRangeUtc } from '../src/common/timezone.util';
import { createTestApp, seedAdmin } from './helpers/e2e';

/**
 * Endpoints del panel de coordinación que listan los servicios asignados
 * del día (con filtros) y los servicios en riesgo (ordenados por severidad
 * y proximidad temporal).
 */
describe('Coordinación: services/today y services/risk (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let patientId: string;
  let addressRosarioId: string;
  let addressBaId: string;
  let providerId: string;

  const auth = (token: string) => ['Authorization', `Bearer ${token}`] as const;

  /** Devuelve un instante UTC que corresponde a la hora `horaAR` del día de hoy en Argentina. */
  function arHourTodayUtc(horaAR: number): Date {
    const { start } = argentinaDayRangeUtc();
    return new Date(start.getTime() + horaAR * 3_600_000);
  }

  /** YYYY-MM-DD del día de hoy en hora Argentina. */
  function fechaHoyAR(): string {
    const { start } = argentinaDayRangeUtc();
    // `start` es UTC pero apunta a 00:00 hora local AR ⇒ +3h da el calendar day AR.
    return new Date(start.getTime() + 3 * 3_600_000)
      .toISOString()
      .slice(0, 10);
  }

  async function crearServicio(
    addressId: string,
    horaArInicio: number,
    horaArFin: number,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/coordination/services')
      .set(...auth(adminToken))
      .send({
        patientId,
        addressId,
        fecha: fechaHoyAR(),
        startTime: arHourTodayUtc(horaArInicio).toISOString(),
        endTime: arHourTodayUtc(horaArFin).toISOString(),
      })
      .expect(201);
    return res.body.id as string;
  }

  async function crearAsignacion(serviceId: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/coordination/assignments')
      .set(...auth(adminToken))
      .send({ serviceId, providerId })
      .expect(201);
    return res.body.id as string;
  }

  async function setearRiskYEstado(
    assignmentId: string,
    riskLevel: string,
    status?: string,
  ): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/api/coordination/assignments/${assignmentId}`)
      .set(...auth(adminToken))
      .send(status ? { riskLevel, status } : { riskLevel })
      .expect(200);
  }

  beforeAll(async () => {
    app = await createTestApp();
    const admin = await seedAdmin(app);
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = loginRes.body.accessToken;

    const providerRes = await request(app.getHttpServer())
      .post('/api/coordination/providers')
      .set(...auth(adminToken))
      .send({
        apellido: 'Coord',
        nombre: 'Test',
        tipoPrestador: 'enfermero',
        email: 'coord-e2e@nareapp.local',
        password: 'coord-e2e-123',
      })
      .expect(201);
    providerId = providerRes.body.id;

    const patientRes = await request(app.getHttpServer())
      .post('/api/coordination/patients')
      .set(...auth(adminToken))
      .send({
        apellido: 'López',
        nombre: 'Ana',
        address: {
          calle: 'Av. Pellegrini 1234',
          ciudad: 'Rosario',
          provincia: 'Santa Fe',
          latitude: -32.9468,
          longitude: -60.6393,
        },
      })
      .expect(201);
    patientId = patientRes.body.id;
    addressRosarioId = patientRes.body.addresses[0].id;

    const addressBaRes = await request(app.getHttpServer())
      .post(`/api/coordination/patients/${patientId}/addresses`)
      .set(...auth(adminToken))
      .send({
        calle: 'Av. de Mayo 800',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        latitude: -34.6092,
        longitude: -58.3853,
      })
      .expect(201);
    addressBaId = addressBaRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/coordination/services/today', () => {
    let asignManana: string;
    let asignTarde: string;
    let asignNoche: string;

    beforeAll(async () => {
      // Tres servicios hoy, distintas franjas y ciudades.
      const sManana = await crearServicio(addressRosarioId, 6, 10); // Rosario / mañana
      const sTarde = await crearServicio(addressBaId, 13, 17); // Buenos Aires / tarde
      const sNoche = await crearServicio(addressRosarioId, 20, 23); // Rosario / noche

      asignManana = await crearAsignacion(sManana);
      asignTarde = await crearAsignacion(sTarde);
      asignNoche = await crearAsignacion(sNoche);

      // Estados distintos para validar el filtro `status`.
      await setearRiskYEstado(asignTarde, 'verde', 'demorado');
    });

    it('sin filtros devuelve los tres servicios del día ordenados por startTime', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today')
        .set(...auth(adminToken))
        .expect(200);

      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toEqual(
        expect.arrayContaining([asignManana, asignTarde, asignNoche]),
      );
      // Ordenado por startTime ASC.
      const tiempos = res.body.map((a: { startTime: string }) =>
        new Date(a.startTime).getTime(),
      );
      expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b));
    });

    it('filtra por ciudad (case-insensitive)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today?city=rosario')
        .set(...auth(adminToken))
        .expect(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toContain(asignManana);
      expect(ids).toContain(asignNoche);
      expect(ids).not.toContain(asignTarde);
    });

    it('filtra por provincia', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today?province=Buenos%20Aires')
        .set(...auth(adminToken))
        .expect(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toEqual([asignTarde]);
    });

    it('filtra por estado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today?status=demorado')
        .set(...auth(adminToken))
        .expect(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toEqual([asignTarde]);
    });

    it('filtra por franja: manana', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today?franja=manana')
        .set(...auth(adminToken))
        .expect(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toEqual([asignManana]);
    });

    it('filtra por franja: tarde', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today?franja=tarde')
        .set(...auth(adminToken))
        .expect(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toEqual([asignTarde]);
    });

    it('filtra por franja: noche', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/today?franja=noche')
        .set(...auth(adminToken))
        .expect(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toEqual([asignNoche]);
    });

    it('rechaza una franja no permitida', async () => {
      await request(app.getHttpServer())
        .get('/api/coordination/services/today?franja=siesta')
        .set(...auth(adminToken))
        .expect(400);
    });
  });

  describe('GET /api/coordination/services/risk', () => {
    let asignVerde: string;
    let asignAmarillo: string;
    let asignNaranja: string;
    let asignRojo: string;

    beforeAll(async () => {
      const sVerde = await crearServicio(addressRosarioId, 7, 11);
      const sAmarillo = await crearServicio(addressRosarioId, 8, 12);
      const sNaranja = await crearServicio(addressRosarioId, 9, 13);
      const sRojo = await crearServicio(addressRosarioId, 10, 14);

      asignVerde = await crearAsignacion(sVerde);
      asignAmarillo = await crearAsignacion(sAmarillo);
      asignNaranja = await crearAsignacion(sNaranja);
      asignRojo = await crearAsignacion(sRojo);

      await setearRiskYEstado(asignAmarillo, 'amarillo');
      await setearRiskYEstado(asignNaranja, 'naranja');
      await setearRiskYEstado(asignRojo, 'rojo');
    });

    it('excluye verde y ordena rojo > naranja > amarillo', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coordination/services/risk')
        .set(...auth(adminToken))
        .expect(200);

      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).not.toContain(asignVerde);

      const enRiesgo = res.body.filter(
        (a: { id: string }) =>
          a.id === asignAmarillo || a.id === asignNaranja || a.id === asignRojo,
      );
      const orden = enRiesgo.map((a: { id: string }) => a.id);
      expect(orden).toEqual([asignRojo, asignNaranja, asignAmarillo]);
    });
  });
});
