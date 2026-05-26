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
  fcm: {
    /** Project ID del proyecto Firebase. Vacío ⇒ modo simulado (no envía). */
    projectId: process.env.FCM_PROJECT_ID ?? '',
    /** Client email del service account de Firebase. */
    clientEmail: process.env.FCM_CLIENT_EMAIL ?? '',
    /**
     * Private key del service account. Las variables de entorno guardan los
     * saltos de línea como `\n`; aquí se reemplazan por saltos reales para
     * que `firebase-admin` pueda parsear la PEM.
     */
    privateKey: (process.env.FCM_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },
});
