# NareApp — Arquitectura

Documento de referencia del diseño de la plataforma de control operativo de
servicios domiciliarios de cuidado.

## 1. Visión

Herramienta operativa para profesionalizar el control de servicios
domiciliarios. Foco en **puntualidad**, **cobertura efectiva** y **prevención
de ausencias y tardanzas**. No es una herramienta de liquidación ni facturación.

Opera inicialmente en Rosario, Santa Fe, Córdoba, Paraná y Buenos Aires.

## 2. Stack tecnológico

| Componente    | Tecnología                    |
|---------------|-------------------------------|
| App mobile    | Flutter (Android / iOS)       |
| Backend / API | NestJS (Node + TypeScript)    |
| Base de datos | PostgreSQL + PostGIS          |
| ORM           | TypeORM                       |
| Panel web     | React + Vite + TypeScript     |
| Push          | Firebase Cloud Messaging      |
| Mapas         | Google Maps Platform          |

**Por qué Flutter:** rendimiento predecible en Android de gama media/baja,
menor deuda de mantenimiento y UX consistente con botones grandes.

## 3. Arquitectura

Monolito modular en NestJS (no microservicios — se evita la sobreingeniería).
El motor de riesgo corre como job programado dentro del mismo proceso.

```
App Mobile (Flutter) ─┐                ┌─ Panel Web (React)
  prestadores         │  REST + JWT    │   coordinación
                      └──────┬─────────┘
                       Backend API (NestJS)
                        + Motor de Riesgo (cron 1 min)
                             │
                  ┌──────────┴───────────┐
              PostgreSQL+PostGIS     FCM (push)
```

## 4. Modelo de datos

15 entidades. Núcleo operativo: **service_assignments** (asignación de un
prestador a un servicio), sobre la que trabajan el motor de riesgo, los
eventos de asistencia y el panel.

- `users` · `providers` · `provider_roles` · `provider_devices`
- `patients` · `patient_addresses` (con geocerca y punto PostGIS)
- `services` · `service_assignments`
- `attendance_events` (check-in/out) · `pre_service_location_events` (tracking)
- `operational_alerts` · `coordination_actions`
- `notification_logs` · `audit_logs` · `app_config`

Timestamps en UTC. Idempotencia en la escritura de eventos operativos.

## 5. API (MVP)

**App mobile:** `auth/login` · `auth/refresh` · `devices/register` ·
`devices/status` · `assignments/today` · `assignments/current` ·
`assignments/{id}/check-in` · `assignments/{id}/check-out` ·
`assignments/{id}/pre-service-location` · `sync/events` · `mobile/config` ·
`push/register-token`.

**Panel:** `coordination/dashboard` · `coordination/services/today` ·
`coordination/services/risk` · `coordination/alerts` ·
`coordination/alerts/{id}/resolve` · `coordination/services/{id}/mark-contacted` ·
`require-replacement` · `assign-replacement` · `coordination/devices/pending` ·
`coordination/devices/{id}/approve|reject|revoke`.

## 6. Motor de riesgo

Reglas deterministas y auditables (sin IA). Evaluación cada minuto. Umbrales
configurables en `app_config`.

| Ventana (t = inicio − ahora) | Condición                  | Nivel    | Alerta            |
|------------------------------|----------------------------|----------|-------------------|
| t > 45 min                   | —                          | verde    | —                 |
| t ≤ 30 min                   | sin señal GPS reciente     | amarillo | `sin_senal_30`    |
| t ≤ 15 min                   | lejos del domicilio        | naranja  | `lejos_15`        |
| t ≤ 15 min                   | sin señal                  | naranja  | `app_sin_conexion`|
| t ≤ 0                        | sin "LLEGUÉ"               | rojo     | `inicio_vencido`  |
| t ≤ −10 min                  | sin "LLEGUÉ"               | rojo     | `ausencia_probable` + requiere reemplazo |
| cualquiera                   | check-in confirmado        | verde    | — (corta tracking)|

## 7. Estrategia GPS

**No hay tracking permanente.** El GPS opera únicamente desde ~45 min antes del
inicio hasta que el prestador confirma "LLEGUÉ". Frecuencia baja (5-10 min),
foreground service con notificación visible, divulgación previa de privacidad,
y corte automático al confirmar la llegada. Diseñado para aprobación en Google
Play y Apple App Store.

## 8. Roadmap

- **MVP:** auth + dispositivos + asignaciones + tracking pre-servicio + motor de
  riesgo + alertas + check-in/out + sync offline + tablero + publicación stores.
- **v1.1:** flujo completo de reemplazos, ETA con tráfico, reportes, multi-
  coordinador, ABM de domicilios en el panel, migración a infraestructura AWS.
- **v2.0:** multi-región, analítica de puntualidad/ausentismo, riesgo predictivo,
  integración con liquidación, autogestión del prestador, portal para clientes.
