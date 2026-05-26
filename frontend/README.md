# NareApp · Panel de coordinación (frontend)

Backoffice web para administrar las entidades operativas de NareApp. Consume la
API REST del backend (`../backend`).

## Stack

- React 18 + TypeScript
- Vite 6
- React Router 6
- TanStack Query 5
- CSS propio (sin librería de UI)

## Requisitos

- Node.js 20+
- El backend de NareApp corriendo y accesible.

## Puesta en marcha

```bash
cd frontend
npm install
cp .env.example .env      # ajustar VITE_API_URL si hace falta
npm run dev               # http://localhost:5173
```

`VITE_API_URL` debe apuntar a la API **incluyendo** el prefijo `/api`
(por defecto `http://localhost:3000/api`).

## Scripts

- `npm run dev` — servidor de desarrollo con HMR.
- `npm run build` — chequeo de tipos (`tsc`) + build de producción a `dist/`.
- `npm run preview` — sirve el build de producción localmente.

## Funcionamiento

- **Login**: contra `POST /api/auth/panel/login`. El access token y el refresh
  token se guardan en `localStorage`; ante un `401` el cliente intenta renovar
  con el refresh token y, si falla, cierra la sesión.
- **CRUD**: una sección por entidad (15 en total). Cada sección ofrece tabla
  con paginación, búsqueda, alta/edición por formulario modal y borrado con
  confirmación. La configuración de columnas y campos de cada entidad vive en
  `src/resources.ts`.
- **Tablero**: resumen operativo del día (`GET /api/coordination/dashboard`).

## Notas

- La búsqueda filtra sobre la página cargada (el endpoint de listado no expone
  búsqueda de texto general).
- Las relaciones entre entidades se ingresan por UUID en los formularios.
- Editar o eliminar registros de auditoría/eventos (asistencia, ubicación,
  notificaciones, auditoría) compromete la trazabilidad: el panel lo advierte.
