/**
 * Configuración tipada de la aplicación, cargada desde variables de entorno.
 * Se accede vía `ConfigService` (p. ej. `config.get('database.host')`).
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  timezone: process.env.APP_TIMEZONE ?? 'America/Argentina/Buenos_Aires',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'nareapp',
    password: process.env.DB_PASSWORD ?? 'nareapp',
    name: process.env.DB_NAME ?? 'nareapp',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '30m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
});
