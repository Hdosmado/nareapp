import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin } from './helpers/e2e';

/**
 * Verifica el ciclo CRUD completo (crear, listar, ver, editar, eliminar) del
 * backoffice para las entidades principales, además del manejo de borrado
 * físico cuando hay integridad referencial en juego.
 */
describe('CRUD del backoffice (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const auth = (token: string) =>
    ['Authorization', `Bearer ${token}`] as const;

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

  it('Users: ciclo CRUD completo sin exponer el hash', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/coordination/users')
      .set(...auth(adminToken))
      .send({
        email: 'coord.crud@nareapp.local',
        password: 'coord-crud-123',
        nombre: 'Coordinador CRUD',
        rol: 'coordinador',
      })
      .expect(201);
    const id = created.body.id;
    expect(created.body.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .get('/api/coordination/users')
      .set(...auth(adminToken))
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body)).toBe(true));

    await request(app.getHttpServer())
      .get(`/api/coordination/users/${id}`)
      .set(...auth(adminToken))
      .expect(200)
      .expect((res) => expect(res.body.id).toBe(id));

    await request(app.getHttpServer())
      .patch(`/api/coordination/users/${id}`)
      .set(...auth(adminToken))
      .send({ nombre: 'Coordinador Editado' })
      .expect(200)
      .expect((res) => {
        expect(res.body.nombre).toBe('Coordinador Editado');
        expect(res.body.passwordHash).toBeUndefined();
      });

    await request(app.getHttpServer())
      .delete(`/api/coordination/users/${id}`)
      .set(...auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/coordination/users/${id}`)
      .set(...auth(adminToken))
      .expect(404);
  });

  it('Providers: ciclo CRUD completo', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/coordination/providers')
      .set(...auth(adminToken))
      .send({
        apellido: 'Test',
        nombre: 'Prestador',
        tipoPrestador: 'enfermero',
        email: 'prestador.crud@nareapp.local',
        password: 'prestador-crud-123',
      })
      .expect(201);
    const id = created.body.id;

    await request(app.getHttpServer())
      .patch(`/api/coordination/providers/${id}`)
      .set(...auth(adminToken))
      .send({ telefono: '341-5550000' })
      .expect(200)
      .expect((res) => expect(res.body.telefono).toBe('341-5550000'));

    await request(app.getHttpServer())
      .delete(`/api/coordination/providers/${id}`)
      .set(...auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/coordination/providers/${id}`)
      .set(...auth(adminToken))
      .expect(404);
  });

  it('Patients y domicilios: CRUD y borrado físico con integridad referencial', async () => {
    const patient = await request(app.getHttpServer())
      .post('/api/coordination/patients')
      .set(...auth(adminToken))
      .send({ apellido: 'Crud', nombre: 'Paciente' })
      .expect(201);
    const patientId = patient.body.id;

    await request(app.getHttpServer())
      .patch(`/api/coordination/patients/${patientId}`)
      .set(...auth(adminToken))
      .send({ telefonoContacto: '341-5551111' })
      .expect(200)
      .expect((res) => expect(res.body.telefonoContacto).toBe('341-5551111'));

    // Domicilio vía su CRUD propio.
    const address = await request(app.getHttpServer())
      .post('/api/coordination/patient-addresses')
      .set(...auth(adminToken))
      .send({
        patientId,
        calle: 'Calle Falsa 123',
        ciudad: 'Rosario',
        provincia: 'Santa Fe',
      })
      .expect(201);
    const addressId = address.body.id;

    // Un servicio que referencia paciente y domicilio.
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    const service = await request(app.getHttpServer())
      .post('/api/coordination/services')
      .set(...auth(adminToken))
      .send({
        patientId,
        addressId,
        fecha: start.toISOString().slice(0, 10),
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 3600 * 1000).toISOString(),
      })
      .expect(201);
    const serviceId = service.body.id;

    // Borrar el paciente con un servicio asociado debe fallar con 409.
    await request(app.getHttpServer())
      .delete(`/api/coordination/patients/${patientId}`)
      .set(...auth(adminToken))
      .expect(409);

    // Tras eliminar el servicio y el domicilio, el paciente sí se borra.
    await request(app.getHttpServer())
      .delete(`/api/coordination/services/${serviceId}`)
      .set(...auth(adminToken))
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/coordination/patient-addresses/${addressId}`)
      .set(...auth(adminToken))
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/coordination/patients/${patientId}`)
      .set(...auth(adminToken))
      .expect(200);
  });

  it('rechaza el acceso al backoffice sin token', async () => {
    await request(app.getHttpServer())
      .get('/api/coordination/users')
      .expect(401);
  });

  it('los 15 listados del backoffice responden 200 con un arreglo', async () => {
    const recursos = [
      'users',
      'providers',
      'provider-roles',
      'patients',
      'patient-addresses',
      'devices',
      'services',
      'assignments',
      'attendance-events',
      'location-events',
      'alerts',
      'actions',
      'notification-logs',
      'app-config',
      'audit-logs',
    ];
    for (const recurso of recursos) {
      const res = await request(app.getHttpServer())
        .get(`/api/coordination/${recurso}`)
        .set(...auth(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    }
  });
});
