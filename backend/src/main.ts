import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NullBodyInterceptor } from './common/interceptors/null-body.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors();
  // DEBUG temporal: traza todas las requests entrantes y su status
  app.use((req: any, res: any, next: any) => {
    const auth = req.headers['authorization'] ? 'Bearer ***' : 'none';
    const dev = req.headers['x-device-id'] ?? 'none';
    res.on('finish', () => {
      // eslint-disable-next-line no-console
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} auth=${auth} device=${dev}`);
    });
    next();
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
