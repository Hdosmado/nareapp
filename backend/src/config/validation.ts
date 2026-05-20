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

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_TTL: Joi.string().default('30m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_TTL: Joi.string().default('30d'),

  FCM_PROJECT_ID: Joi.string().allow('').optional(),
  FCM_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FCM_PRIVATE_KEY: Joi.string().allow('').optional(),
  GOOGLE_MAPS_API_KEY: Joi.string().allow('').optional(),
});
