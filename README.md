**NareApp — Plataforma de Control Operativo de Cuidado Domiciliario**

Herramienta operativa para la gestión y el control de servicios domiciliarios de cuidado, asistencia y supervisión. Su objetivo principal es garantizar la puntualidad, la cobertura efectiva y la prevención de ausencias y retrasos, reduciendo la carga manual del equipo de coordinación. Queda fuera del alcance la liquidación de haberes y la facturación.

**Componentes**

| Carpeta   | Componente                              | Estado       |
|-----------|-----------------------------------------|--------------|
| backend/  | API REST + WebSocket (NestJS)           | En desarrollo|
| mobile/   | App para prestadores (Flutter)          | Pendiente    |
| panel/    | Panel web de coordinación (React + Vite)| Pendiente    |
| docs/     | Documentación de arquitectura y diseño  | En desarrollo|

El desarrollo se realiza con un enfoque backend-first: primero se define la API y, sobre ese contrato, se construyen la aplicación móvil y el panel web.

**Stack tecnológico**

| Componente       | Tecnología                 |
|------------------|----------------------------|
| Backend / API    | NestJS (Node + TypeScript) |
| Base de datos    | PostgreSQL + PostGIS       |
| ORM              | TypeORM                    |
| Aplicación móvil | Flutter                    |
| Panel web        | React + Vite + TypeScript  |
| Notificaciones   | Firebase Cloud Messaging   |
| Mapas            | Google Maps Platform       |

**Documentación**

La documentación del backend (instalación, configuración y uso) se encuentra en `backend/README.md`.

**Nomenclatura del dominio**

Se utiliza terminología operativa y legal específica: prestador, prestación de servicios, servicio asignado, coordinación, cobertura, ausencia, retraso, reemplazo. No se emplean términos propios de una relación de dependencia (empleado/a, trabajador/a).
