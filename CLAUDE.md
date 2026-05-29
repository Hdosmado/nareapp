# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es NareApp

Plataforma de **control operativo** de servicios domiciliarios de cuidado. Foco en puntualidad, cobertura efectiva y prevención de ausencias/tardanzas. **No** es facturación ni liquidación. Tres componentes en un monorepo:

- `backend/` — API REST + WebSocket (NestJS 11, TypeORM, PostgreSQL+PostGIS). Incluye el motor de riesgo como job en proceso (cron 1 min).
- `frontend/` — Panel web de coordinación (React 18 + Vite 6 + TanStack Query + React Router). CSS propio, sin librería de UI.
- `mobile/` — App Flutter del **prestador** (Riverpod + Dio, offline-first).
- `docs/` — `ARQUITECTURA.md` (visión + motor de riesgo + estrategia GPS) y `CONTEXTO-APP-MOBILE.md`.

El proyecto se construye **backend primero**: la API define el contrato; el panel y la app mobile lo consumen.

## Nomenclatura obligatoria del dominio

Usar terminología operativa/legal: **prestador**, **persona a cuidar**, **prestación**, **servicio asignado**, **coordinación**, **cobertura**, **ausencia**, **tardanza**, **reemplazo**. **No** usar: empleada, trabajadora, paciente, check-in (en docs/UX), turno, RRHH. Sin emoji.

## Comandos por componente

### backend/

```bash
npm install
npm run start:dev               # arranque con HMR (puerto 3000, prefijo /api)
npm run build                   # compila a dist/
npm run start:prod              # node dist/main

# Migraciones (TypeORM, src/database/data-source.ts)
npm run migration:generate -- src/database/migrations/<Nombre>
npm run migration:run
npm run migration:revert

# Datos
npm run seed                    # crea admin@nareapp.local / cambiar123
bash scripts/seed-demo.sh       # prestador + persona + servicio + código de activación de prueba

# Tests
npm test                                                # unit (jest, *.spec.ts en src/)
npm run test:e2e                                        # e2e (NODE_ENV=test, --runInBand, usa .env.test → DB nareapp_test con DB_SYNCHRONIZE=true)
npm test -- src/modules/auth/auth.service.spec.ts       # un archivo
npm test -- -t "nombre del test"                        # filtrado por describe/it
```

No hay `lint` configurado en el backend.

### frontend/

```bash
npm install
npm run dev                     # Vite, http://localhost:5173, HMR
npm run build                   # tsc + vite build → dist/  (sirve también de typecheck)
npm run preview
```

`VITE_API_URL` debe apuntar a la API **incluyendo** `/api` (default `http://localhost:3000/api`). No hay test runner ni lint configurados.

### mobile/  (Flutter)

```bash
flutter pub get
flutter run    --dart-define=BACKEND_URL=http://IP_LOCAL:3000
flutter build apk --debug --dart-define=BACKEND_URL=http://IP_LOCAL:3000
flutter analyze                                    # análisis estático
flutter test                                       # tests unitarios
flutter test test/path/file_test.dart              # un archivo
flutter test --plain-name "nombre del test"        # filtrar por nombre
```

`BACKEND_URL` se inyecta en **build-time**, no en runtime. Default `http://192.168.1.100:3000`. Nunca uses `localhost` desde un dispositivo físico; un emulador Android puede usar `10.0.2.2`. La API key de Google Maps (Android) se pasa con `-P MAPS_API_KEY=…` o env `MAPS_API_KEY=…`; en iOS se setea como User-Defined Build Setting `MAPS_API_KEY` en el target Runner (el `Info.plist` ya tiene `$(MAPS_API_KEY)`). Habilitar la API y obtener la key: ver `docs/MAPS-SETUP.md`.

## Entorno local de este WSL (importante)

Este entorno **no tiene Docker** y el cluster del sistema (`postgresql-14`) ya ocupa el 5432. El cluster de desarrollo se levantó en `~/pgdata` escuchando en el **puerto 5433**, y `backend/.env` ya tiene `DB_HOST=127.0.0.1`, `DB_PORT=5433`. Arrancarlo:

```bash
/usr/lib/postgresql/14/bin/pg_ctl -D ~/pgdata \
  -o "-p 5433 -c listen_addresses=127.0.0.1 -k /tmp" \
  -l ~/pgdata/server.log start
```

Toolchain Flutter/Android/JDK 17 está en `~/sdks/`. Antes de usar `flutter`/`adb`/`java`:

```bash
source ~/sdks/env.sh
```

Para que un emulador Android levantado en Windows hable con el backend que corre en WSL, ejecutar `conectar-emulador.bat` **como administrador** desde Windows (configura `netsh portproxy` 3000 → IP de WSL). El emulador usa luego `http://10.0.2.2:3000`.

Si en otro entorno hay Docker, `backend/docker-compose.yml` levanta Postgres+PostGIS en el 5432 (la opción canónica del repo).

## Arquitectura — qué leer cuando

### Monolito modular NestJS

`backend/src/app.module.ts` es el índice maestro. Patrón uniforme por dominio bajo `src/modules/<nombre>/`: módulo + controller(s) + service(s) + entidades TypeORM + DTOs. Para entender el contrato operativo end-to-end leer en orden:

1. `auth/` (login prestador y panel, refresh) → `devices/` (activación + aprobación) → `providers/` + `patients/` → `services/` (servicios + `service_assignments`).
2. `tracking/` (ventana GPS pre-servicio) y `attendance/` (LLEGUÉ / FIN DE SERVICIO).
3. `sync/` — `POST /api/sync/events` con `idempotencyKey` para reenvíos offline; punto único por el que la app reentrega eventos demorados.
4. `risk-engine/` — autoritativo del lado del servidor, corre por `@nestjs/schedule` cada minuto. Umbrales en `app_config`. Reglas detalladas en `docs/ARQUITECTURA.md` §6.
5. `alerts/` + `coordination/` + `notifications/` (FCM) — consumidores del estado producido por el motor.
6. `audit/` es global y se carga temprano.

Guards globales registrados en `AppModule`: `JwtAuthGuard` autentica, `RolesGuard` autoriza (en ese orden). `main.ts` aplica helmet, CORS abierto, prefijo `/api`, `ValidationPipe` con `forbidNonWhitelisted` y `AllExceptionsFilter` global. Throttler protege específicamente el endpoint público de activación (límite en `ACTIVATION_CLAIM_RATE_LIMIT`).

### Reglas no obvias del contrato

- **Timestamps en UTC**; presentación en `America/Argentina/Buenos_Aires` (`APP_TIMEZONE`). No mezclar zonas en la capa de servicio.
- **Idempotencia** en toda escritura de evento operativo (check-in/out, ubicación, sync). La clave la genera el cliente; el backend deduplica.
- **`X-Device-Id`** además del JWT en los endpoints operativos del prestador; debe estar **aprobado** por coordinación. Sin dispositivo aprobado → 403, no 401.
- **GPS no permanente**: solo opera ~45 min antes del servicio y se corta en cuanto se confirma "LLEGUÉ". Diseñado así para aprobación en stores; no introducir tracking continuo.

### Frontend del panel

- Configuración declarativa de las 15 entidades en `frontend/src/resources.ts` — columnas, formulario, relaciones por buscador (`lib/refs.ts`), campos `readOnly` / `autogenerate`, recursos `readonly` (logs/eventos inmutables). Componentes genéricos (`EntityListPage`, `EntityFormModal`) renderizan a partir de eso.
- `lib/api.ts` maneja access + refresh tokens en `localStorage`; ante `401` intenta renovar y, si falla, cierra sesión.
- La búsqueda filtra **sobre la página cargada** (el endpoint de listado no expone búsqueda general). Documentado y deliberado.
- Páginas no genéricas: `DashboardPage`, `CalendarPage`, `MapPage` (mapa operativo con `react-leaflet`, color por `riskLevel`, refresh 30 s), `ServiceDetailPage`, `DevicesPendingPage`.

### App mobile

- Capas: `core/` (tema y constantes) → `data/` (`models`, `api` con interceptor Dio que adjunta Bearer + `X-Device-Id` y refresca ante 401, `storage` con `flutter_secure_storage`, `repositories`) → `services/` (GPS, conectividad, identidad, push) → `state/` (Riverpod) → `ui/` (`widgets/` design system, `screens/`).
- Activación primaria: **código numérico de 8 dígitos** (autoformato `4829-1573`). El QR es secundario.
- Offline-first: cada evento se persiste local; intento directo si hay red; si no, cola y resync vía `POST /api/sync/events` con su clave de idempotencia.
- Firebase y Google Maps están integrados como **placeholders**: regenerar `lib/firebase_options.dart`, `android/app/google-services.json` y `ios/Runner/GoogleService-Info.plist` con `flutterfire configure` antes de producción. Sin credenciales reales la app sigue operando (sin push); el mapa muestra "For development purposes only".

## Tests

- **backend** — unit tests con jest en `src/**/*.spec.ts` (config dentro de `package.json`); e2e en `backend/test/*.e2e-spec.ts` con su propio `jest-e2e.json` (corren `--runInBand`, levantan Nest con `.env.test` → DB `nareapp_test`, `DB_SYNCHRONIZE=true` recrea esquema). Para correr e2e necesitás el cluster de Postgres arriba y la DB `nareapp_test` creada con `postgis`.
- **frontend** — no hay test runner configurado todavía. `npm run build` ejecuta `tsc` y sirve de chequeo de tipos.
- **mobile** — `flutter test` para lógica de dominio; `flutter analyze` debe quedar sin issues.
