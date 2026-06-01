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
    // Sin fallback público: la validación de entorno (config/validation.ts)
    // garantiza que estos secretos existan y sean fuertes antes de arrancar.
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '30m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
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
  activation: {
    /** Base del deep link / URL embebida en el QR de activación (secundario). */
    urlBase: process.env.ACTIVATION_URL_BASE ?? 'https://app.empresa.com',
    /** Vigencia del código y del QR de activación, en horas. */
    codeTtlHours: parseInt(process.env.ACTIVATION_CODE_TTL_HOURS ?? '24', 10),
    /** Intentos de reclamo permitidos por token antes de revocarlo. */
    maxClaimAttempts: parseInt(
      process.env.ACTIVATION_MAX_CLAIM_ATTEMPTS ?? '5',
      10,
    ),
    /** Reclamos permitidos por IP en una ventana de 60s (rate limiting). */
    claimRateLimit: parseInt(process.env.ACTIVATION_CLAIM_RATE_LIMIT ?? '30', 10),
    /** URL de descarga de la app que se incluye en el mensaje de WhatsApp. */
    appDownloadUrl:
      process.env.APP_DOWNLOAD_URL ?? 'https://app.empresa.com/descargar',
  },
});
