import * as Joi from 'joi';

/**
 * Esquema de validación de las variables de entorno. La aplicación no arranca
 * si falta una variable obligatoria o tiene un valor inválido.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  APP_TIMEZONE: Joi.string().default('America/Argentina/Buenos_Aires'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('nareapp'),
  DB_PASSWORD: Joi.string().default('nareapp'),
  DB_NAME: Joi.string().default('nareapp'),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Los secretos JWT son obligatorios en todos los entornos. En PRODUCCIÓN se
  // exigen además fuertes: longitud mínima de 32 caracteres y nunca los
  // placeholders públicos del repo. En dev/test pueden ser valores propios
  // más cortos (p.ej. los de .env.test), pero igual deben estar presentes.
  JWT_ACCESS_SECRET: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .min(32)
        .invalid(
          'cambiar-en-produccion-access-secret',
          'cambiar-en-produccion-refresh-secret',
          'dev-access-secret',
          'dev-refresh-secret',
        )
        .required(),
    }),
  JWT_ACCESS_TTL: Joi.string().default('30m'),
  JWT_REFRESH_SECRET: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .min(32)
        .invalid(
          'cambiar-en-produccion-access-secret',
          'cambiar-en-produccion-refresh-secret',
          'dev-access-secret',
          'dev-refresh-secret',
        )
        .required(),
    }),
  JWT_REFRESH_TTL: Joi.string().default('30d'),

  ACTIVATION_URL_BASE: Joi.string().default('https://app.empresa.com'),
  ACTIVATION_CODE_TTL_HOURS: Joi.number().default(24),
  ACTIVATION_MAX_CLAIM_ATTEMPTS: Joi.number().default(5),
  // Reclamos de activación por minuto por IP. Endurecido (H5): 5/min por
  // defecto frente a los 30 originales, que facilitaban la fuerza bruta del
  // código de 8 dígitos. Configurable por entorno.
  ACTIVATION_CLAIM_RATE_LIMIT: Joi.number().default(5),
  APP_DOWNLOAD_URL: Joi.string().default('https://app.empresa.com/descargar'),

  FCM_PROJECT_ID: Joi.string().allow('').optional(),
  FCM_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FCM_PRIVATE_KEY: Joi.string().allow('').optional(),
  GOOGLE_MAPS_API_KEY: Joi.string().allow('').optional(),
});
