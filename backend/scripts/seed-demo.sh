#!/usr/bin/env bash
# Carga datos de demostración para probar la app mobile de punta a punta:
# un prestador, una persona a cuidar con domicilio, un servicio de hoy y su
# asignación. Al final imprime el código de activación de 8 dígitos.
#
# Requisitos: el backend corriendo en :3000 y el usuario admin sembrado
# (`npm run seed`).
#
# Uso:  bash scripts/seed-demo.sh
set -euo pipefail

API=${API:-http://127.0.0.1:3000/api}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@nareapp.local}
ADMIN_PASS=${ADMIN_PASS:-cambiar123}

field() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)"; }

echo "1/7  Login del panel de coordinación..."
TOKEN=$(curl -s -X POST "$API/auth/panel/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" | field "['accessToken']")
AUTH="Authorization: Bearer $TOKEN"

echo "2/7  Alta del prestador..."
PROV_ID=$(curl -s -X POST "$API/coordination/providers" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"nombre":"María","apellido":"González","tipoPrestador":"cuidadora","email":"maria@demo.local","password":"demo123","telefono":"3415551234"}' \
  | field "['id']")

echo "3/7  Alta de la persona a cuidar..."
PAT_ID=$(curl -s -X POST "$API/coordination/patients" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"nombre":"Rosa","apellido":"Pérez","telefonoContacto":"3415559876"}' \
  | field "['id']")

echo "4/7  Alta del domicilio..."
ADDR_ID=$(curl -s -X POST "$API/coordination/patients/$PAT_ID/addresses" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"calle":"Córdoba 1234","ciudad":"Rosario","provincia":"Santa Fe","latitude":-32.9468,"longitude":-60.6393,"allowedRadiusM":150}' \
  | field "['id']")

echo "5/7  Alta del servicio (hoy)..."
FECHA=$(date +%F)
START=$(date -u +%FT%H:%M:%S.000Z)
END=$(date -u -d '+4 hours' +%FT%H:%M:%S.000Z)
SVC_ID=$(curl -s -X POST "$API/coordination/services" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"patientId\":\"$PAT_ID\",\"addressId\":\"$ADDR_ID\",\"fecha\":\"$FECHA\",\"startTime\":\"$START\",\"endTime\":\"$END\"}" \
  | field "['id']")

echo "6/7  Asignación del prestador al servicio..."
curl -s -X POST "$API/coordination/assignments" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"serviceId\":\"$SVC_ID\",\"providerId\":\"$PROV_ID\"}" >/dev/null

echo "7/7  Generación del código de activación..."
ACT=$(curl -s -X POST "$API/coordination/providers/$PROV_ID/activation" -H "$AUTH" -H 'Content-Type: application/json')
CODE=$(echo "$ACT" | field "['activationCodeFormatted']")

echo
echo "==================================================="
echo "  Código de activación:  $CODE"
echo "  Vence en 24 horas, un solo uso."
echo
echo "  Login de reingreso:    maria@demo.local / demo123"
echo "==================================================="
