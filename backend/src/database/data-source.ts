import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config();

/**
 * DataSource usado por la CLI de TypeORM para generar y correr migraciones.
 * No se usa en tiempo de ejecución de la app (eso lo maneja `database.config.ts`).
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'nareapp',
  password: process.env.DB_PASSWORD ?? 'nareapp',
  database: process.env.DB_NAME ?? 'nareapp',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  namingStrategy: new SnakeNamingStrategy(),
});
