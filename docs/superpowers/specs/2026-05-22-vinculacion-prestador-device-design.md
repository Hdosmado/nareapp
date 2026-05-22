# Diseño — Vinculación prestador ↔ dispositivo por código de activación

**Fecha:** 2026-05-22
**Estado:** Aprobado (pendiente de plan de implementación)
**Módulo:** `backend/src/modules/devices`

## 1. Problema

Hay que vincular el teléfono de un prestador con su registro en NareApp. El
scaffolding actual lo resuelve con un QR que contiene una URL
(`app.empresa.com/activate?token=XXX`). Ese mecanismo no funciona para el
escenario real:

- **El QR no se puede escanear "hacia adentro" de una app que aún no está
  instalada.** Escaneado con la cámara nativa abre el navegador, no la app;
  arrastrar el token a través de la instalación exige *deferred deep linking*
  (Firebase Dynamic Links — discontinuado en 2025 — o un servicio pago).
  Frágil y deuda de mantenimiento.
- **El escenario es remoto.** El coordinador está en la oficina (panel) y el
  prestador está en otro lado con su propio teléfono, normalmente unidos por
  una llamada. El prestador no ve la pantalla del coordinador, y un QR enviado
  por WhatsApp no se puede escanear (no se puede apuntar la cámara a la propia
  pantalla).
- **Los prestadores son usuarios poco tecnológicos.** Cada permiso de cámara,
  encuadre o escaneo es un punto de falla.

El diseño del *token* existente (un solo uso, hasheado, TTL corto) es correcto.
El punto débil es el **medio de entrega** (QR/URL).

## 2. Solución

Desacoplar el token de su medio de entrega. La misma fila de token tiene dos
representaciones: el `rawToken` largo (para el QR) y un **código corto numérico**
tipeable. El código se puede **dictar por teléfono** o mandar por WhatsApp,
no necesita cámara ni *deep link*, y **sobrevive a la instalación**: primero se
instala la app (con un link de tienda, que abre confiable), después se tipea el
código, que es independiente de cómo se instaló.

El **código** es el mecanismo principal. El **QR** se sigue generando en la
misma fila, sin costo extra, como opción secundaria para un eventual caso
presencial.

## 3. Workflow end-to-end

### Alta de un prestador nuevo

1. El **coordinador** crea el prestador completo en el panel: nombre, apellido,
   email, tipo, teléfono. El prestador no carga ningún dato propio.
2. El coordinador abre la ficha del prestador y genera un **código de
   activación**.
3. El panel muestra: el código grande (`4829-1573`), un QR equivalente, el
   vencimiento y un botón "Copiar mensaje de WhatsApp" (texto armado con saludo
   + link de tienda + código + instrucción).
4. El coordinador llama o manda WhatsApp al prestador con el link de tienda y
   el código.
5. El **prestador** instala la app (el link abre la tienda en la app correcta),
   la abre y cae en la pantalla "Activar mi teléfono".
6. El prestador tipea el código y toca "Activar".
7. El backend valida, vincula el teléfono al prestador (`APROBADO`), consume el
   código (un solo uso) y emite la sesión JWT.
8. La app muestra "Hola, {nombre}. Tu teléfono quedó activado" y queda operativa.

### Reemplazo de teléfono (reactivación)

Idéntico, sin el paso de alta: el coordinador genera un código nuevo para el
prestador existente; el teléfono anterior se marca como reemplazado/revocado.

## 4. Cambios en el modelo de datos

### `DeviceActivationToken`

- **Quitar** `tipoPrestador`.
- `provider` pasa a **no-nullable** (siempre hay un prestador asociado).
- **Agregar** `shortCodeHash` (indexado) — hash SHA-256 del código normalizado.
  El código en claro nunca se persiste.
- Conservar `tokenHash` para el QR. Una misma fila tiene ambas representaciones.
- **Agregar** `attemptCount` (entero, default 0) — intentos fallidos de claim
  contra esa fila, para cortar fuerza bruta sobre un código concreto.

El enum `ActivationTokenStatus` no cambia.

## 5. Cambios en el backend

### Generación

Un único método de generación, ligado a un prestador existente. Produce a la
vez el `rawToken` largo y el `activationCode` corto, guarda ambos hashes en la
fila, y devuelve al panel: código, URL del QR, `expiresAt` y el texto de
WhatsApp armado. Revoca cualquier token pendiente previo del prestador.

Se **elimina** `createInvitation` y el `ProviderInvitationController` — el
endpoint `coordination/provider-invitations` desaparece. El alta del prestador
ya no nace de un token; se hace siempre en el panel.

### `claimActivation`

- `ClaimActivationDto` acepta `activationToken` **o** `activationCode`
  (exactamente uno; validación cruzada).
- Según cuál venga, busca por `tokenHash` o por `shortCodeHash`.
- Se **elimina** la rama `registerProviderFromClaim` y los campos
  `apellido/nombre/email/telefono` del DTO. Siempre resuelve un prestador
  existente (`resolveExistingProvider`).
- En un claim fallido por código (no encontrado / vencido), incrementar
  `attemptCount`; superado un umbral configurable, el token queda inutilizable.
- El resto del flujo (conflicto de device con otro prestador, single-use,
  emisión de sesión) se mantiene igual.

### Formato del código

Numérico de **8 dígitos**, presentado agrupado `4829-1573`. Numérico para que
se dicte por teléfono sin ambigüedad. 10⁸ combinaciones, que con un solo uso +
TTL acotado + rate limiting + `attemptCount` es seguro.

### Vencimiento

TTL del código **configurable**, default **24 horas**, separado del TTL del QR
(15 min). El código pasa por una llamada + instalación, que llevan tiempo.
Sigue siendo de un solo uso. Se agrega la clave de configuración correspondiente
en `configuration.ts`.

### Seguridad del endpoint público

`POST /mobile/activation/claim` es público (la app aún no tiene sesión). Se
agrega rate limiting (`@nestjs/throttler`) por IP, además del `attemptCount`
por token. El código corto lo hace necesario.

## 6. Panel de coordinación (React — `frontend/`)

- Ficha del prestador, sección "Activación del dispositivo": muestra el device
  vinculado (modelo, estado, último contacto) o "sin dispositivo".
- Botón "Generar código de activación" → panel con el código grande, el QR,
  el vencimiento y "Copiar mensaje de WhatsApp".
- Si hay un código vigente, se muestra con "Regenerar" (revoca el anterior) y
  "Revocar". Estados visibles: vigente / vencido / usado.

`ProviderActivationController` se ajusta para devolver también `activationCode`
y el texto de WhatsApp. Sus endpoints (`GET :id/device`, `POST :id/activation-qr`,
`POST :id/activation-qr/revoke`) se conservan.

## 7. App mobile (Flutter) — contrato

El repo solo contiene backend y panel; esta sección es un **contrato** para el
equipo mobile, no se implementa en este plan.

- Pantalla "Activar mi teléfono": instrucción simple, campo de código grande
  con teclado numérico y autoformato en grupos de 4, botón "Activar" grande.
  Botón secundario "Escanear QR" para el caso presencial.
- Pantalla de éxito: "Hola, {nombre}. Tu teléfono quedó activado."
- Es la primera pantalla tras instalar, sin sesión previa.

## 8. Manejo de errores

Los mensajes del service ya son accionables; se adapta la terminología "QR" →
"código". Se distinguen los casos:

- Código incorrecto / no encontrado.
- Código vencido.
- Código ya usado.
- Código revocado.
- El teléfono ya está vinculado a otro prestador (conflicto de device).

## 9. Testing

Suite de `DeviceActivationService`:

- Claim por código OK.
- Claim por token de QR OK.
- Código vencido / usado / revocado.
- `attemptCount` incrementa y bloqueo por umbral.
- Rate limiting del endpoint.
- Conflicto de device con otro prestador.
- Reactivación de un prestador existente.

El repo ya tiene infraestructura de tests (`test/`, specs existentes).

## 10. Alcance del plan de implementación

- Backend completo: entidad, servicio, controllers, DTOs, configuración,
  rate limiting, tests.
- Endpoints del panel ajustados (devolver `activationCode` y texto de WhatsApp).
- La implementación de la UI del panel (React) y la app mobile (Flutter) quedan
  fuera de este plan; la UI del panel se planifica aparte y la app mobile queda
  especificada como contrato.

## 11. Fuera de alcance (YAGNI)

- Envío automático de WhatsApp/SMS (integración con Twilio o WhatsApp Business
  API). El MVP arma el texto y el coordinador lo copia/pega en su WhatsApp.
- *Deep linking* / *deferred deep linking*.
- Activación por número de teléfono + OTP.
