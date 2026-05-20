import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '../common/enums';
import { User } from '../modules/auth/entities/user.entity';
import dataSource from './data-source';

/**
 * Siembra el usuario administrador inicial del panel de coordinación.
 * Ejecutar una sola vez tras crear el esquema:  npm run seed
 */
async function seed(): Promise<void> {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@nareapp.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'cambiar123';

  const existing = await users.findOne({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`El usuario ${email} ya existe. Nada que sembrar.`);
  } else {
    await users.save(
      users.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        nombre: 'Administrador',
        rol: UserRole.ADMIN,
        estado: UserStatus.ACTIVO,
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`Usuario administrador creado: ${email} / ${password}`);
    // eslint-disable-next-line no-console
    console.log('IMPORTANTE: cambiá la contraseña tras el primer ingreso.');
  }

  await dataSource.destroy();
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Error en el seed:', error);
  process.exit(1);
});
