import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NullBodyInterceptor } from './common/interceptors/null-body.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  // CORS con credenciales: el panel envía la cookie HttpOnly del refresh token.
  // Orígenes permitidos vía CORS_ORIGINS (coma-separados). Si no se define,
  // refleja el origen del request (apto para desarrollo). No usar '*' con
  // credenciales: por eso configuramos `origin` explícito + `credentials`.
  const corsEnv = process.env.CORS_ORIGINS;
  app.enableCors({
    origin: corsEnv ? corsEnv.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });
  app.setGlobalPrefix(config.get<string>('apiPrefix', 'api'));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new NullBodyInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.get<number>('port', 3000);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`NareApp backend escuchando en el puerto ${port}`);
}

void bootstrap();
