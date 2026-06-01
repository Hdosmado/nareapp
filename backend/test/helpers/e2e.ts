import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { UserRole, UserStatus } from '../../src/common/enums';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { User } from '../../src/modules/auth/entities/user.entity';

/**
 * Levanta una instancia de la app NestJS configurada igual que en producción.
 * Usa la base `nareapp_test`, que se recrea en cada corrida (dropSchema).
 *
 * El rate limiting (ThrottlerGuard) queda ACTIVO: el límite del claim viene de
 * config (ACTIVATION_CLAIM_RATE_LIMIT, 30 en .env.test), suficiente para los
 * tests funcionales y para que el test dedicado de fuerza bruta lo ejercite.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

/** Inserta un usuario administrador y devuelve sus credenciales. */
export async function seedAdmin(
  app: INestApplication,
  email = 'admin-e2e@nareapp.local',
  password = 'admin-e2e-123',
): Promise<{ email: string; password: string }> {
  const users = app.get(DataSource).getRepository(User);
  await users.save(
    users.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      nombre: 'Administrador E2E',
      rol: UserRole.ADMIN,
      estado: UserStatus.ACTIVO,
    }),
  );
  return { email, password };
}
