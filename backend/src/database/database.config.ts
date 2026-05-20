import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/**
 * Configuración asíncrona de TypeORM para el módulo raíz.
 * Las entidades se cargan automáticamente (`autoLoadEntities`).
 * El esquema NO se sincroniza solo: los cambios se aplican vía migraciones.
 */
export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    username: config.get<string>('database.username'),
    password: config.get<string>('database.password'),
    database: config.get<string>('database.name'),
    synchronize: config.get<boolean>('database.synchronize'),
    logging: config.get<boolean>('database.logging'),
    autoLoadEntities: true,
    namingStrategy: new SnakeNamingStrategy(),
  }),
};
