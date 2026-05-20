# NareApp Backend

API REST para el control operativo de servicios domiciliarios de cuidado.
Construida con **NestJS**, **TypeORM** y **PostgreSQL + PostGIS**.

## Requisitos

- Node.js 20+ (probado con 22)
- PostgreSQL 16 con extensión PostGIS — recomendado vía Docker

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env          # editar los JWT secrets antes de producción

# 3. Levantar la base de datos (PostgreSQL + PostGIS)
docker compose up -d

# 4. Crear el esquema de la base de datos — dos opciones:
#    A) Desarrollo rápido: poner DB_SYNCHRONIZE=true en .env (TypeORM crea
#       el esquema desde las entidades al arrancar).
#    B) Recomendado: generar y aplicar migraciones
npm run migration:generate -- src/database/migrations/InitialSchema
npm run migration:run

# 5. Sembrar el usuario administrador del panel
npm run seed                  # crea admin@nareapp.local / cambiar123

# 6. Arrancar en modo desarrollo
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api`.

## Scripts

| Script                       | Descripción                                  |
|-------------------------------|----------------------------------------------|
| `npm run start:dev`           | Arranca con recarga en caliente              |
| `npm run build`               | Compila a `dist/`                            |
| `npm run migration:generate`  | Genera una migración a partir de las entidades |
| `npm run migration:run`       | Aplica las migraciones pendientes            |
| `npm run migration:revert`    | Revierte la última migración                 |
| `npm run seed`                | Crea el usuario administrador inicial        |
| `npm test`                    | Ejecuta los tests                            |

## Estructura

```
src/
├── main.ts              Punto de entrada
├── app.module.ts        Módulo raíz
├── config/              Configuración y validación de entorno
├── database/            DataSource, migraciones y seed
├── common/              Guards, decorators, filtros, utilidades geo y de fecha
└── modules/             Módulos de dominio
    ├── auth/            Login JWT (prestador y panel) + refresh
    ├── config/          Parámetros operativos (app_config)
    ├── devices/         Registro y aprobación de dispositivos
    ├── providers/       ABM de prestadores
    ├── patients/        ABM de personas a cuidar y domicilios
    ├── services/        Servicios, asignaciones y consultas operativas
    ├── attendance/      Check-in / check-out (LLEGUÉ / FIN DE SERVICIO)
    ├── tracking/        Ubicaciones de la ventana de tracking pre-servicio
    ├── sync/            Sincronización de eventos offline
    ├── alerts/          Alertas operativas
    ├── coordination/    Tablero y acciones de coordinación
    ├── notifications/   Notificaciones push (FCM)
    ├── audit/           Auditoría transversal
    └── risk-engine/     Motor de riesgo (job programado cada minuto)
```

## Autenticación

- **Prestador (app mobile):** `POST /api/auth/login` → access + refresh token.
- **Panel de coordinación:** `POST /api/auth/panel/login`.
- Todas las rutas exigen JWT salvo las marcadas como públicas.
- Los endpoints operativos del prestador exigen además el header
  `X-Device-Id` con un dispositivo **aprobado** por coordinación.

## Convenciones

- Timestamps en **UTC**; se muestran en `America/Argentina/Buenos_Aires`.
- Las escrituras de eventos usan `idempotencyKey` para tolerar reenvíos.
- El **motor de riesgo** es autoritativo del lado del servidor.
