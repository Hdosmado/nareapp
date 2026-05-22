# Vinculación prestador ↔ dispositivo por código de activación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el QR como mecanismo principal de vinculación por un código de activación corto, numérico, que el coordinador genera en el panel y el prestador tipea en la app.

**Architecture:** Una misma fila de `DeviceActivationToken` tiene dos representaciones del mismo token de un solo uso: un código corto numérico (`shortCodeHash`) y el token largo del QR (`tokenHash`). El endpoint público `POST /mobile/activation/claim` acepta cualquiera de los dos, vincula el dispositivo al prestador y emite la sesión. Se elimina la rama de "alta dentro de la app": el prestador siempre se crea en el panel, así que el token siempre referencia un prestador existente.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, `@nestjs/throttler` (nuevo), Jest + Supertest (e2e).

---

## Notas de contexto

- **Todos los comandos se ejecutan desde `backend/`.**
- **Migraciones:** el proyecto no tiene carpeta de migraciones; usa `synchronize` (activado vía `DB_SYNCHRONIZE`, `true` en `.env.test`). Los cambios de entidad se aplican solos en dev/test. Si más adelante se adoptan migraciones, habrá que generar una para estos cambios — fuera de alcance de este plan.
- **Tests:** el repo usa specs e2e en `test/` contra una base PostgreSQL real (`nareapp_test`). Requieren PostgreSQL corriendo. Se corren con `npm run test:e2e`.
- **Desviación respecto del spec:** el spec mencionaba TTLs separados para el código (24 h) y el QR (15 min). Como ambos son la misma fila de token, comparten un único `expiresAt`; se unificó en 24 h configurables. El spec ya fue corregido.
- **Alcance:** solo backend. La UI del panel (React) y la app mobile (Flutter) quedan fuera.

## Estructura de archivos

**Se modifican:**
- `backend/src/config/configuration.ts` — parámetros de activación.
- `backend/src/config/validation.ts` — variables de entorno nuevas.
- `backend/src/app.module.ts` — registro de `ThrottlerModule`.
- `backend/src/modules/devices/entities/device-activation-token.entity.ts` — `shortCodeHash`, `attemptCount`, `provider` no-nullable, sin `tipoPrestador`.
- `backend/src/modules/devices/dto/claim-activation.dto.ts` — acepta código o token; sin datos de alta.
- `backend/src/modules/devices/device-activation.service.ts` — generación de código + claim por código.
- `backend/src/modules/devices/mobile-activation.controller.ts` — rate limiting.
- `backend/src/modules/devices/provider-activation.controller.ts` — llama al método de generación renombrado.
- `backend/src/modules/devices/devices.module.ts` — quita `ProviderInvitationController`.

**Se crean:**
- `backend/test/activation.e2e-spec.ts` — suite e2e del flujo.

**Se eliminan:**
- `backend/src/modules/devices/provider-invitation.controller.ts`
- `backend/src/modules/devices/dto/create-invitation.dto.ts`

---

## Task 1: Parámetros de configuración de activación

**Files:**
- Modify: `backend/src/config/configuration.ts:25-30`
- Modify: `backend/src/config/validation.ts:27-32`

- [ ] **Step 1: Reemplazar el bloque `activation` en `configuration.ts`**

Reemplazar el bloque actual (líneas 25-30) por:

```typescript
  activation: {
    /** Base de la URL embebida en el QR de activación. */
    urlBase: process.env.ACTIVATION_URL_BASE ?? 'https://app.empresa.com',
    /** Vigencia del código/QR de activación, en horas. */
    codeTtlHours: parseInt(process.env.ACTIVATION_CODE_TTL_HOURS ?? '24', 10),
    /** Intentos de claim fallidos antes de revocar la activación. */
    maxClaimAttempts: parseInt(process.env.ACTIVATION_MAX_ATTEMPTS ?? '5', 10),
    /** Tope de requests por minuto al endpoint público de claim. */
    claimRateLimit: parseInt(
      process.env.ACTIVATION_CLAIM_RATE_LIMIT ?? '30',
      10,
    ),
    /** URL de descarga de la app, incluida en el mensaje de WhatsApp. */
    appDownloadUrl:
      process.env.ACTIVATION_APP_DOWNLOAD_URL ??
      'https://play.google.com/store',
  },
```

- [ ] **Step 2: Agregar las variables al esquema de validación**

En `backend/src/config/validation.ts`, agregar dentro del `Joi.object({ ... })`, después del bloque `FCM_*`/`GOOGLE_MAPS_API_KEY`:

```typescript
  ACTIVATION_URL_BASE: Joi.string().default('https://app.empresa.com'),
  ACTIVATION_CODE_TTL_HOURS: Joi.number().default(24),
  ACTIVATION_MAX_ATTEMPTS: Joi.number().default(5),
  ACTIVATION_CLAIM_RATE_LIMIT: Joi.number().default(30),
  ACTIVATION_APP_DOWNLOAD_URL: Joi.string().default(
    'https://play.google.com/store',
  ),
```

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `npm run build`
Expected: compila sin errores. `device-activation.service.ts` todavía referencia `activation.tokenTtlMin` (ahora inexistente), pero `config.get('...')` acepta cualquier string y devuelve `undefined`, que cae en el `?? 15`. No es un error de compilación; se corrige en la Task 3.

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/configuration.ts backend/src/config/validation.ts
git commit -m "feat: parámetros de configuración del código de activación"
```

---

## Task 2: Rate limiting del endpoint público de claim

**Files:**
- Modify: `backend/package.json` (vía `npm install`)
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/modules/devices/mobile-activation.controller.ts`

- [ ] **Step 1: Instalar `@nestjs/throttler`**

Run: `npm install @nestjs/throttler`
Expected: se agrega a `dependencies` en `package.json`.

- [ ] **Step 2: Registrar `ThrottlerModule` en `app.module.ts`**

En `backend/src/app.module.ts`, cambiar el import de `@nestjs/config` para incluir `ConfigService`:

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
```

Agregar el import de throttler junto al resto de imports de la cabecera:

```typescript
import { ThrottlerModule } from '@nestjs/throttler';
```

Dentro del array `imports` del `@Module`, después de `TypeOrmModule.forRootAsync(databaseConfig),`, agregar:

```typescript
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            limit: config.get<number>('activation.claimRateLimit') ?? 30,
            ttl: 60_000,
          },
        ],
      }),
    }),
```

- [ ] **Step 3: Aplicar el guard al controller de activación mobile**

Reemplazar el contenido completo de `backend/src/modules/devices/mobile-activation.controller.ts` por:

```typescript
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { DeviceActivationService } from './device-activation.service';
import { ClaimActivationDto } from './dto/claim-activation.dto';

/**
 * Endpoint público que consume la app del prestador para activarse.
 * Es público porque la app todavía no tiene sesión: el código/QR es la
 * credencial. `ThrottlerGuard` limita los intentos por IP (el código es corto).
 */
@UseGuards(ThrottlerGuard)
@Controller('mobile/activation')
export class MobileActivationController {
  constructor(private readonly activation: DeviceActivationService) {}

  /** Reclama una activación: vincula el dispositivo y abre sesión. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('claim')
  claim(@Body() dto: ClaimActivationDto) {
    return this.activation.claimActivation(dto);
  }
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/app.module.ts backend/src/modules/devices/mobile-activation.controller.ts
git commit -m "feat: rate limiting en el endpoint público de activación"
```

---

## Task 3: Generación de código, claim por código, y baja de la rama de alta-en-app (TDD)

Esta task escribe primero la suite e2e (rojo), después implementa hasta verde. El build solo queda verde al final; el commit es el último step.

**Files:**
- Create: `backend/test/activation.e2e-spec.ts`
- Modify: `backend/src/modules/devices/entities/device-activation-token.entity.ts`
- Modify: `backend/src/modules/devices/dto/claim-activation.dto.ts`
- Modify: `backend/src/modules/devices/device-activation.service.ts`
- Modify: `backend/src/modules/devices/provider-activation.controller.ts`
- Modify: `backend/src/modules/devices/devices.module.ts`
- Delete: `backend/src/modules/devices/provider-invitation.controller.ts`
- Delete: `backend/src/modules/devices/dto/create-invitation.dto.ts`

- [ ] **Step 1: Escribir la suite e2e**

Crear `backend/test/activation.e2e-spec.ts` con este contenido exacto:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { DeviceActivationToken } from '../src/modules/devices/entities/device-activation-token.entity';
import { createTestApp, seedAdmin } from './helpers/e2e';

/**
 * Verifica la vinculación prestador ↔ dispositivo por código de activación:
 * generación, claim por código y por token de QR, y los casos de borde.
 */
describe('Activación de dispositivo por código (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const auth = (token: string) =>
    ['Authorization', `Bearer ${token}`] as const;

  /** Crea un prestador desde el panel y devuelve su id. */
  const createProvider = async (email: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/coordination/providers')
      .set(...auth(adminToken))
      .send({
        apellido: 'Prueba',
        nombre: 'Prestador',
        tipoPrestador: 'enfermero',
        email,
        password: 'prestador-activacion-123',
      })
      .expect(201);
    return res.body.id;
  };

  /** Genera una activación para un prestador y devuelve el cuerpo de respuesta. */
  const generateActivation = async (
    providerId: string,
  ): Promise<{
    activationCode: string;
    activationUrl: string;
    whatsappMessage: string;
    expiresAt: string;
    tokenId: string;
  }> => {
    const res = await request(app.getHttpServer())
      .post(`/api/coordination/providers/${providerId}/activation-qr`)
      .set(...auth(adminToken))
      .expect(200);
    return res.body;
  };

  beforeAll(async () => {
    app = await createTestApp();
    const admin = await seedAdmin(app, 'admin-activation@nareapp.local');
    const res = await request(app.getHttpServer())
      .post('/api/auth/panel/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('genera un código de 8 dígitos y un mensaje de WhatsApp', async () => {
    const providerId = await createProvider('p1@nareapp.local');
    const activation = await generateActivation(providerId);
    expect(activation.activationCode).toMatch(/^\d{8}$/);
    expect(activation.whatsappMessage).toContain(
      `${activation.activationCode.slice(0, 4)}-${activation.activationCode.slice(4)}`,
    );
    expect(activation.activationUrl).toContain('token=');
  });

  it('vincula el dispositivo al reclamar con el código y abre sesión', async () => {
    const providerId = await createProvider('p2@nareapp.local');
    const { activationCode } = await generateActivation(providerId);

    const res = await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode, deviceId: 'device-p2', platform: 'android' })
      .expect(200);

    expect(res.body.provider.id).toBe(providerId);
    expect(res.body.device.status).toBe('active');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('acepta el código con guiones (4829-1573)', async () => {
    const providerId = await createProvider('p3@nareapp.local');
    const { activationCode } = await generateActivation(providerId);
    const dashed = `${activationCode.slice(0, 4)}-${activationCode.slice(4)}`;

    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode: dashed, deviceId: 'device-p3', platform: 'android' })
      .expect(200);
  });

  it('reclama también con el token largo del QR', async () => {
    const providerId = await createProvider('p4@nareapp.local');
    const { activationUrl } = await generateActivation(providerId);
    const rawToken = new URL(activationUrl).searchParams.get('token') as string;

    const res = await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationToken: rawToken,
        deviceId: 'device-p4',
        platform: 'android',
      })
      .expect(200);
    expect(res.body.provider.id).toBe(providerId);
  });

  it('rechaza un código inexistente', async () => {
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode: '00000000', deviceId: 'device-x', platform: 'android' })
      .expect(400);
  });

  it('rechaza el body sin código ni token', async () => {
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ deviceId: 'device-y', platform: 'android' })
      .expect(400);
  });

  it('rechaza reclamar dos veces el mismo código', async () => {
    const providerId = await createProvider('p5@nareapp.local');
    const { activationCode } = await generateActivation(providerId);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode, deviceId: 'device-p5', platform: 'android' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode, deviceId: 'device-p5', platform: 'android' })
      .expect(400);
  });

  it('rechaza un código revocado', async () => {
    const providerId = await createProvider('p6@nareapp.local');
    const { activationCode } = await generateActivation(providerId);
    await request(app.getHttpServer())
      .post(`/api/coordination/providers/${providerId}/activation-qr/revoke`)
      .set(...auth(adminToken))
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode, deviceId: 'device-p6', platform: 'android' })
      .expect(400);
  });

  it('rechaza un código vencido', async () => {
    const providerId = await createProvider('p7@nareapp.local');
    const { activationCode, tokenId } = await generateActivation(providerId);
    const tokens = app.get(DataSource).getRepository(DeviceActivationToken);
    await tokens.update(tokenId, { expiresAt: new Date(Date.now() - 1000) });
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({ activationCode, deviceId: 'device-p7', platform: 'android' })
      .expect(400);
  });

  it('rechaza vincular un teléfono ya activo con otro prestador', async () => {
    const providerA = await createProvider('p8a@nareapp.local');
    const providerB = await createProvider('p8b@nareapp.local');

    const a = await generateActivation(providerA);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationCode: a.activationCode,
        deviceId: 'device-shared',
        platform: 'android',
      })
      .expect(200);

    const b = await generateActivation(providerB);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationCode: b.activationCode,
        deviceId: 'device-shared',
        platform: 'android',
      })
      .expect(409);
  });

  it('revoca la activación tras superar los intentos fallidos', async () => {
    const providerA = await createProvider('p9a@nareapp.local');
    const providerB = await createProvider('p9b@nareapp.local');

    // Un teléfono ya activo con otro prestador, para forzar el 409 repetido.
    const a = await generateActivation(providerA);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationCode: a.activationCode,
        deviceId: 'device-locked',
        platform: 'android',
      })
      .expect(200);

    const b = await generateActivation(providerB);
    // 5 intentos fallidos por conflicto de dispositivo (umbral configurado = 5).
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/mobile/activation/claim')
        .send({
          activationCode: b.activationCode,
          deviceId: 'device-locked',
          platform: 'android',
        })
        .expect(409);
    }
    // El 6º intento encuentra la activación ya revocada.
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationCode: b.activationCode,
        deviceId: 'device-locked',
        platform: 'android',
      })
      .expect(400);
  });

  it('reactivación: vincula un teléfono nuevo a un prestador existente', async () => {
    const providerId = await createProvider('p10@nareapp.local');
    const first = await generateActivation(providerId);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationCode: first.activationCode,
        deviceId: 'device-old',
        platform: 'android',
      })
      .expect(200);

    const second = await generateActivation(providerId);
    await request(app.getHttpServer())
      .post('/api/mobile/activation/claim')
      .send({
        activationCode: second.activationCode,
        deviceId: 'device-new',
        platform: 'android',
      })
      .expect(200);
  });

  it('limita la cantidad de intentos por minuto (rate limit)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 40; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/mobile/activation/claim')
        .send({
          activationCode: '00000000',
          deviceId: 'device-rl',
          platform: 'android',
        });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
```

- [ ] **Step 2: Correr la suite y verificar que falla**

Run: `npm run test:e2e -- activation`
Expected: FALLA. Antes de implementar, la respuesta de generación no trae `activationCode` y el claim por código no está soportado, así que la mayoría de los tests fallan. (El test de "body sin código ni token" puede pasar de casualidad; no importa.)

- [ ] **Step 3: Actualizar la entidad `DeviceActivationToken`**

Reemplazar el contenido completo de `backend/src/modules/devices/entities/device-activation-token.entity.ts` por:

```typescript
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ActivationTokenStatus } from '../../../common/enums';
import { Provider } from '../../providers/entities/provider.entity';

/**
 * Token de activación del dispositivo de un prestador. Coordinación lo genera
 * desde el panel para un prestador ya existente; la app lo reclama una sola vez.
 *
 * Una misma fila tiene dos representaciones del mismo token:
 *  - `shortCodeHash`: código corto numérico que el prestador tipea en la app.
 *  - `tokenHash`: token largo embebido en el QR (opción secundaria, presencial).
 *
 * Seguridad: nunca se persiste el valor en claro, solo su hash SHA-256. Es de
 * un solo uso y vence en una ventana acotada.
 */
@Entity('device_activation_tokens')
export class DeviceActivationToken extends BaseEntity {
  /** Prestador al que se vinculará el dispositivo. Siempre presente. */
  @ManyToOne(() => Provider, { nullable: false, onDelete: 'CASCADE' })
  provider: Provider;

  /** Hash SHA-256 del token largo del QR. El valor en claro nunca se persiste. */
  @Index()
  @Column()
  tokenHash: string;

  /** Hash SHA-256 del código corto numérico. El valor en claro nunca se persiste. */
  @Index()
  @Column()
  shortCodeHash: string;

  @Column({
    type: 'enum',
    enum: ActivationTokenStatus,
    default: ActivationTokenStatus.PENDING,
  })
  status: ActivationTokenStatus;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date;

  /** Usuario de coordinación que generó la activación. */
  @Column({ type: 'uuid' })
  createdByUserId: string;

  /** `deviceId` lógico que reclamó el token (solo cuando `status = used`). */
  @Column({ nullable: true })
  usedByDeviceId: string;

  /** Intentos de claim fallidos; al superar el umbral, la activación se revoca. */
  @Column({ type: 'int', default: 0 })
  attemptCount: number;
}
```

- [ ] **Step 4: Actualizar `ClaimActivationDto`**

Reemplazar el contenido completo de `backend/src/modules/devices/dto/claim-activation.dto.ts` por:

```typescript
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DevicePlatform } from '../../../common/enums';

/**
 * Cuerpo que envía la app del prestador al reclamar una activación.
 * Endpoint público: la app todavía no tiene sesión. Debe venir exactamente uno
 * de `activationCode` (tipeado) o `activationToken` (escaneado del QR).
 */
export class ClaimActivationDto {
  /** Código corto numérico tipeado por el prestador (admite guiones/espacios). */
  @IsOptional()
  @IsString()
  activationCode?: string;

  /** Token largo extraído del QR escaneado. */
  @IsOptional()
  @IsString()
  @MinLength(20)
  activationToken?: string;

  /** Identificador lógico del dispositivo (lo captura la app). */
  @IsString()
  deviceId: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  pushToken?: string;
}
```

- [ ] **Step 5: Reescribir `DeviceActivationService`**

Reemplazar el contenido completo de `backend/src/modules/devices/device-activation.service.ts` por:

```typescript
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, randomInt } from 'crypto';
import { Not, Repository } from 'typeorm';
import {
  ActivationTokenStatus,
  DeviceStatus,
  ProviderStatus,
} from '../../common/enums';
import { AuthService } from '../auth/auth.service';
import { Provider } from '../providers/entities/provider.entity';
import { ClaimActivationDto } from './dto/claim-activation.dto';
import { DeviceActivationToken } from './entities/device-activation-token.entity';
import { ProviderDevice } from './entities/provider-device.entity';

/** Hash SHA-256 de un valor; lo único que se persiste de un token o código. */
function hashValue(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Normaliza un código tipeado: solo dígitos (descarta guiones y espacios). */
function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '');
}

export interface ActivationResult {
  /** Código corto que el prestador tipea en la app. Se devuelve una sola vez. */
  activationCode: string;
  /** URL embebida en el QR (opción secundaria, presencial). */
  activationUrl: string;
  /** Mensaje listo para que coordinación copie y pegue en WhatsApp. */
  whatsappMessage: string;
  expiresAt: Date;
  tokenId: string;
}

export interface ActivationClaimResult {
  provider: {
    id: string;
    apellido: string;
    nombre: string;
    tipoPrestador: string;
  };
  device: { id: string; status: 'active' };
  accessToken: string;
  refreshToken: string;
}

/**
 * Flujo de activación del dispositivo del prestador.
 *
 * Coordinación crea al prestador en el panel y genera una activación: un código
 * corto numérico (que el prestador tipea) y un token de QR equivalente, ambos
 * sobre la misma fila. La app reclama cualquiera de los dos una sola vez; en ese
 * acto el dispositivo queda vinculado y operativo.
 */
@Injectable()
export class DeviceActivationService {
  constructor(
    @InjectRepository(DeviceActivationToken)
    private readonly tokens: Repository<DeviceActivationToken>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /** Construye la URL de activación a partir del token largo en claro. */
  private buildActivationUrl(rawToken: string): string {
    const urlBase =
      this.config.get<string>('activation.urlBase') ??
      'https://app.empresa.com';
    return `${urlBase}/activate?token=${rawToken}`;
  }

  /** Vencimiento de una activación nueva, según la configuración. */
  private nextExpiry(): Date {
    const ttlHours = this.config.get<number>('activation.codeTtlHours') ?? 24;
    return new Date(Date.now() + ttlHours * 3600_000);
  }

  /** Genera un código corto numérico de 8 dígitos. */
  private generateCode(): string {
    return randomInt(0, 100_000_000).toString().padStart(8, '0');
  }

  /** Texto sugerido para que coordinación lo envíe por WhatsApp. */
  private buildWhatsappMessage(
    provider: Provider,
    code: string,
    expiresAt: Date,
  ): string {
    const downloadUrl =
      this.config.get<string>('activation.appDownloadUrl') ??
      'https://play.google.com/store';
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    const vence = expiresAt.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    return [
      `Hola ${provider.nombre}, activamos tu app de NareApp.`,
      `1) Instalá la app: ${downloadUrl}`,
      `2) Abrila y tocá "Activar mi teléfono".`,
      `3) Ingresá este código: ${formatted}`,
      `El código vence el ${vence}.`,
    ].join('\n');
  }

  /**
   * Genera una activación para un prestador existente: produce el código corto
   * y el token del QR sobre la misma fila. Revoca toda activación pendiente
   * previa del prestador.
   */
  async generateActivation(
    providerId: string,
    coordinatorUserId: string,
  ): Promise<ActivationResult> {
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }
    if (provider.estado !== ProviderStatus.ACTIVO) {
      throw new ConflictException('El prestador no está activo');
    }

    await this.revokePendingTokens(providerId);

    const rawToken = randomBytes(32).toString('base64url');
    const code = this.generateCode();
    const expiresAt = this.nextExpiry();
    const token = await this.tokens.save(
      this.tokens.create({
        provider,
        tokenHash: hashValue(rawToken),
        shortCodeHash: hashValue(code),
        status: ActivationTokenStatus.PENDING,
        expiresAt,
        createdByUserId: coordinatorUserId,
      }),
    );
    return {
      activationCode: code,
      activationUrl: this.buildActivationUrl(rawToken),
      whatsappMessage: this.buildWhatsappMessage(provider, code, expiresAt),
      expiresAt,
      tokenId: token.id,
    };
  }

  /** Revoca las activaciones pendientes de un prestador. */
  async revokePendingTokens(providerId: string): Promise<{ revoked: number }> {
    const result = await this.tokens
      .createQueryBuilder()
      .update()
      .set({ status: ActivationTokenStatus.REVOKED })
      .where('provider_id = :providerId', { providerId })
      .andWhere('status = :status', { status: ActivationTokenStatus.PENDING })
      .execute();
    return { revoked: result.affected ?? 0 };
  }

  /**
   * Reclama una activación desde la app, por código corto o por token de QR.
   * Vincula el dispositivo al prestador y devuelve la sesión. Endpoint público.
   */
  async claimActivation(
    dto: ClaimActivationDto,
  ): Promise<ActivationClaimResult> {
    const token = await this.resolveToken(dto);
    this.assertTokenClaimable(token);

    const provider = await this.resolveProvider(token);
    const now = new Date();

    // ¿El teléfono ya está vinculado y activo con OTRO prestador?
    const conflicting = await this.devices.findOne({
      where: {
        deviceId: dto.deviceId,
        estado: DeviceStatus.APROBADO,
        provider: { id: Not(provider.id) },
      },
    });
    if (conflicting) {
      await this.registerFailedAttempt(token);
      throw new ConflictException(
        'Este teléfono ya está vinculado. Contactá a coordinación.',
      );
    }

    // Reutiliza la fila (prestador, deviceId) si ya existía; si no, la crea.
    let device = await this.devices.findOne({
      where: { deviceId: dto.deviceId, provider: { id: provider.id } },
    });
    if (device) {
      device.plataforma = dto.platform;
      device.modelo = dto.model ?? device.modelo;
      device.osVersion = dto.osVersion ?? device.osVersion;
      device.appVersion = dto.appVersion ?? device.appVersion;
      device.pushToken = dto.pushToken ?? device.pushToken;
      device.estado = DeviceStatus.APROBADO;
      device.activatedAt = now;
      device.revokedAt = null;
      device.lastSeenAt = now;
    } else {
      device = this.devices.create({
        provider,
        deviceId: dto.deviceId,
        plataforma: dto.platform,
        modelo: dto.model,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        pushToken: dto.pushToken,
        estado: DeviceStatus.APROBADO,
        activatedAt: now,
        lastSeenAt: now,
      });
    }
    device = await this.devices.save(device);

    // Consume la activación: un solo uso.
    token.status = ActivationTokenStatus.USED;
    token.usedAt = now;
    token.usedByDeviceId = dto.deviceId;
    await this.tokens.save(token);

    const session = this.auth.issueProviderSession(provider, dto.deviceId);
    return {
      provider: session.provider,
      device: { id: device.id, status: 'active' },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Resuelve el token por código corto o por token de QR. Exige exactamente uno
   * de los dos en el cuerpo.
   */
  private async resolveToken(
    dto: ClaimActivationDto,
  ): Promise<DeviceActivationToken> {
    const hasCode = !!dto.activationCode?.trim();
    const hasToken = !!dto.activationToken?.trim();
    if (hasCode === hasToken) {
      throw new BadRequestException(
        'Ingresá el código de activación para continuar.',
      );
    }

    const where = hasCode
      ? { shortCodeHash: hashValue(normalizeCode(dto.activationCode as string)) }
      : { tokenHash: hashValue(dto.activationToken as string) };

    const token = await this.tokens.findOne({
      where,
      relations: { provider: true },
    });
    if (!token) {
      throw new BadRequestException(
        'No se pudo activar la app. Pedí una nueva activación a coordinación.',
      );
    }
    return token;
  }

  /** Verifica que la activación esté vigente y sin usar. */
  private assertTokenClaimable(token: DeviceActivationToken): void {
    if (token.status === ActivationTokenStatus.USED) {
      throw new BadRequestException(
        'Esta activación ya fue utilizada. Pedí una nueva a coordinación.',
      );
    }
    if (token.status === ActivationTokenStatus.REVOKED) {
      throw new BadRequestException(
        'No se pudo activar la app. Pedí una nueva activación a coordinación.',
      );
    }
    if (
      token.status === ActivationTokenStatus.EXPIRED ||
      token.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'La activación venció. Pedí una nueva a coordinación.',
      );
    }
  }

  /** El token siempre referencia un prestador existente; valida que siga activo. */
  private async resolveProvider(
    token: DeviceActivationToken,
  ): Promise<Provider> {
    const provider = token.provider
      ? await this.providers.findOne({ where: { id: token.provider.id } })
      : null;
    if (!provider || provider.estado !== ProviderStatus.ACTIVO) {
      throw new BadRequestException(
        'No se pudo activar la app. Contactá a coordinación.',
      );
    }
    return provider;
  }

  /** Suma un intento fallido; al alcanzar el umbral, revoca la activación. */
  private async registerFailedAttempt(
    token: DeviceActivationToken,
  ): Promise<void> {
    const max = this.config.get<number>('activation.maxClaimAttempts') ?? 5;
    token.attemptCount += 1;
    if (token.attemptCount >= max) {
      token.status = ActivationTokenStatus.REVOKED;
    }
    await this.tokens.save(token);
  }

  /**
   * Estado del dispositivo de un prestador para el panel: el dispositivo más
   * reciente y si hay una activación vigente. Nunca expone el código ni el token.
   */
  async getProviderDeviceState(providerId: string): Promise<{
    device: ProviderDevice | null;
    pendingToken: { id: string; expiresAt: Date; createdAt: Date } | null;
  }> {
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    const device = await this.devices.findOne({
      where: { provider: { id: providerId } },
      order: { createdAt: 'DESC' },
    });

    const token = await this.tokens.findOne({
      where: {
        provider: { id: providerId },
        status: ActivationTokenStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    const pendingToken =
      token && token.expiresAt.getTime() > Date.now()
        ? {
            id: token.id,
            expiresAt: token.expiresAt,
            createdAt: token.createdAt,
          }
        : null;

    return { device: device ?? null, pendingToken };
  }
}
```

- [ ] **Step 6: Actualizar `ProviderActivationController`**

En `backend/src/modules/devices/provider-activation.controller.ts`, en el método `generate`, cambiar la llamada al servicio:

```typescript
  /** Genera una activación para el prestador (revoca la anterior). */
  @HttpCode(HttpStatus.OK)
  @Post(':id/activation-qr')
  generate(@Param() { id }: IdParamDto, @CurrentUser() user: JwtPayload) {
    return this.activation.generateActivation(id, user.sub);
  }
```

(Solo cambia `generateActivationQr` por `generateActivation`. El resto del archivo queda igual.)

- [ ] **Step 7: Quitar `ProviderInvitationController` de `devices.module.ts`**

Reemplazar el contenido completo de `backend/src/modules/devices/devices.module.ts` por:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Provider } from '../providers/entities/provider.entity';
import { CoordinationDevicesController } from './coordination-devices.controller';
import { DeviceActivationService } from './device-activation.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceActivationToken } from './entities/device-activation-token.entity';
import { ProviderDevice } from './entities/provider-device.entity';
import { DeviceApprovedGuard } from './guards/device-approved.guard';
import { MobileActivationController } from './mobile-activation.controller';
import { ProviderActivationController } from './provider-activation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderDevice, Provider, DeviceActivationToken]),
    AuthModule,
  ],
  controllers: [
    DevicesController,
    CoordinationDevicesController,
    MobileActivationController,
    ProviderActivationController,
  ],
  providers: [DevicesService, DeviceActivationService, DeviceApprovedGuard],
  exports: [DevicesService, DeviceApprovedGuard, TypeOrmModule],
})
export class DevicesModule {}
```

- [ ] **Step 8: Eliminar los archivos de la rama de alta-en-app**

Run:
```bash
git rm backend/src/modules/devices/provider-invitation.controller.ts backend/src/modules/devices/dto/create-invitation.dto.ts
```
Expected: ambos archivos quedan eliminados y staged.

- [ ] **Step 9: Verificar que el proyecto compila**

Run: `npm run build`
Expected: compila sin errores. Si aparece un error por un import residual de `CreateInvitationDto`, `ProviderInvitationController` o `tipoPrestador`, eliminarlo.

- [ ] **Step 10: Correr la suite e2e y verificar que pasa**

Run: `npm run test:e2e -- activation`
Expected: PASA. Los 13 tests de `activation.e2e-spec.ts` en verde.

- [ ] **Step 11: Correr la suite e2e completa para verificar que no se rompió nada**

Run: `npm run test:e2e`
Expected: PASA. Ningún test de `auth`, `crud` ni `flujo-operativo` se rompe por estos cambios.

- [ ] **Step 12: Commit**

```bash
git add backend/test/activation.e2e-spec.ts backend/src/modules/devices/
git commit -m "feat: vinculación de dispositivo por código de activación"
```

---

## Self-Review (completado)

- **Cobertura del spec:** §3 workflow → Task 3 (generación + claim). §4 modelo de datos → Task 3 Step 3 (entidad). §5 backend → Tasks 1 y 3. §5 rate limiting → Task 2. §8 manejo de errores → mensajes en el servicio (Task 3 Step 5). §9 testing → Task 3 Step 1. §6 endpoints del panel → Task 3 Step 6. La UI del panel y la app mobile están explícitamente fuera de alcance (§10).
- **Placeholders:** ninguno; todo el código está completo.
- **Consistencia de tipos:** `generateActivation`, `ActivationResult`, `claimActivation`, `ActivationClaimResult`, `resolveToken`, `assertTokenClaimable`, `resolveProvider`, `registerFailedAttempt`, `revokePendingTokens` y `getProviderDeviceState` se usan con la misma firma en servicio, controller y tests.
