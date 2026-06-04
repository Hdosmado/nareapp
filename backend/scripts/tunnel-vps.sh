#!/usr/bin/env bash
#
# Abre un tunel SSH desde esta maquina hacia la base PostgreSQL del VPS (DonWeb).
# La base remota (que en el VPS escucha en 127.0.0.1:5432) queda accesible
# localmente en 127.0.0.1:5434, que es a donde apunta backend/.env.
#
# Uso:
#   bash scripts/tunnel-vps.sh
#
# Dejalo corriendo en una terminal mientras desarrollas. Cortalo con Ctrl+C.
# Requiere la llave ~/.ssh/nareapp_vps (ya instalada en el servidor).
#
set -euo pipefail

VPS_HOST="66.97.40.234"
VPS_PORT="5875"
VPS_USER="root"
KEY="${HOME}/.ssh/nareapp_vps"
LOCAL_PORT="5434"

if [ ! -f "${KEY}" ]; then
  echo "ERROR: no encuentro la llave SSH en ${KEY}" >&2
  exit 1
fi

echo "Abriendo tunel:  localhost:${LOCAL_PORT}  ->  ${VPS_USER}@${VPS_HOST}:5432 (base de datos)"
echo "Dejalo corriendo. Cortalo con Ctrl+C."

exec ssh -i "${KEY}" -p "${VPS_PORT}" -N \
  -L "${LOCAL_PORT}:127.0.0.1:5432" \
  -o IdentitiesOnly=yes \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  "${VPS_USER}@${VPS_HOST}"
