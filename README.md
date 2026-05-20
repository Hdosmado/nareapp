# NareApp — Plataforma de Control Operativo de Cuidado Domiciliario

Herramienta operativa para la gestión y control de **servicios domiciliarios de
cuidado, asistencia y supervisión**. El foco del producto es la **puntualidad**,
la **cobertura efectiva de servicios** y la **prevención de ausencias y
tardanzas**, reduciendo la carga manual del área de coordinación.

> No es una herramienta de liquidación ni facturación.

## Componentes

| Carpeta    | Componente                                   | Estado            |
|------------|----------------------------------------------|-------------------|
| `backend/` | API REST + WebSocket (NestJS)                | 🟡 En desarrollo  |
| `mobile/`  | App para prestadores (Flutter)               | ⚪ Pendiente      |
| `panel/`   | Panel web de coordinación (React + Vite)     | ⚪ Pendiente      |
| `docs/`    | Documentación de arquitectura y diseño       | 🟡 En desarrollo  |

El proyecto se construye **backend primero**: la API define el contrato sobre el
que luego se montan la app mobile y el panel web.

## Stack tecnológico

| Componente      | Tecnología                        |
|-----------------|-----------------------------------|
| Backend / API   | NestJS (Node + TypeScript)        |
| Base de datos   | PostgreSQL + PostGIS              |
| ORM             | TypeORM                           |
| App mobile      | Flutter                           |
| Panel web       | React + Vite + TypeScript         |
| Push            | Firebase Cloud Messaging          |
| Mapas           | Google Maps Platform              |

## Arranque rápido

El backend se documenta en [`backend/README.md`](backend/README.md).

## Nomenclatura del dominio

El dominio usa terminología operativa/legal coherente: **prestador**,
**prestación de servicio**, **servicio asignado**, **coordinación**,
**cobertura**, **ausencia**, **tardanza**, **reemplazo**. No se utiliza
terminología de relación de dependencia (empleada/trabajadora).
