# Multi-stage build de NareApp backend.
#
# Etapa 1: instala dependencias completas (incluyendo dev) y compila TS.
# Etapa 2: corre el bundle compilado con dependencias de producción
# únicamente, sobre node:20-alpine para una imagen runtime chica.

# --- Etapa 1: build -----------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copia metadatos primero para aprovechar la caché de capas.
COPY package.json package-lock.json* ./
RUN npm ci

# Copia el resto del código y compila.
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev


# --- Etapa 2: runtime ---------------------------------------------------------
FROM node:20-alpine AS runtime

# `tini` como init: maneja señales (PID 1 limpio, evita zombies).
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Usuario no-root.
RUN addgroup -S nareapp && adduser -S nareapp -G nareapp

# Solo lo necesario para correr el bundle compilado.
COPY --from=build --chown=nareapp:nareapp /app/node_modules ./node_modules
COPY --from=build --chown=nareapp:nareapp /app/dist ./dist
COPY --from=build --chown=nareapp:nareapp /app/package.json ./package.json

USER nareapp
EXPOSE 3000

# Healthcheck simple: HTTP 200 en /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider --tries=1 \
    http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
