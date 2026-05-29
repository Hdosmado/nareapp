# NareApp — Contexto para el diseño de la app mobile

Documento de contexto para diseñar la interfaz de la **app mobile del
prestador**. Resume el producto, el usuario, las restricciones de diseño y las
pantallas del MVP. No es un contrato de API: es el material para tomar
decisiones de UX/UI.

---

## 1. Qué es NareApp

Plataforma de **control operativo de servicios domiciliarios de cuidado**
(asistencia y supervisión de personas en su casa). El foco del producto es la
**puntualidad**, la **cobertura efectiva de los servicios** y la **prevención
de ausencias y tardanzas**.

- **No** es una app de liquidación, facturación ni de fichaje laboral.
- Opera en Argentina (Rosario, Santa Fe, Córdoba, Paraná y Buenos Aires).
- Dos piezas de software para personas:
  - **App mobile (Flutter)** → la usan los **prestadores** en la calle. *Es lo
    que se está diseñando.*
  - **Panel web (React)** → lo usa el equipo de **coordinación** en la oficina.
    Fuera de alcance acá.

**Nomenclatura del dominio** (usar siempre, en español rioplatense):
prestador, prestación / servicio, asignación, coordinación, cobertura,
ausencia, tardanza, reemplazo. **Nunca** terminología de relación de
dependencia (empleado/a, trabajador/a, jefe, fichar, sueldo).

---

## 2. El usuario de la app: el prestador

Quien usa la app es el **prestador** — la persona que va al domicilio a
cuidar: cuidadora, enfermero, asistente terapéutico, supervisor, auditor
médico. Perfil real a tener presente en cada pantalla:

- **Poco tecnológico.** Cada permiso, cada campo, cada paso extra es un punto
  de falla. Asume baja alfabetización digital.
- **En movimiento y a la intemperie.** Usa el teléfono en la calle, en el
  colectivo, frente a la puerta del domicilio, con luz solar directa y a veces
  con una sola mano.
- **Teléfono propio, gama media/baja.** Android viejo, pantalla chica, batería
  y datos limitados, conectividad intermitente.
- **Foco en una sola cosa a la vez.** Llegó / no llegó, hoy tengo / no tengo
  servicio. No quiere explorar la app.

### Implicancias de diseño (no negociables)

- **Una acción principal por pantalla**, expresada como botón grande y obvio.
- **Botones y áreas táctiles generosos** (pensados para dedo grande, apuro,
  guantes, frío).
- **Alto contraste, tipografía grande**, legible bajo el sol.
- **Lenguaje llano**, frases cortas, sin tecnicismos. Mensajes que dicen qué
  hacer, no qué pasó.
- **Tolerante a la falta de conexión**: la app debe funcionar offline y
  sincronizar después; nunca culpar al usuario por estar sin señal.
- **Rendimiento sobre adorno**: animaciones mínimas, nada pesado. Flutter se
  eligió justamente por rendimiento predecible en gama baja.
- Estética: **sobria, confiable, operativa** — herramienta de trabajo, no red
  social. Limpia, ordenada, tranquila.

---

## 3. El recorrido del prestador (flujos y pantallas del MVP)

### 3.1 Activación del teléfono (primera vez, sin sesión)

Es la **primera pantalla al abrir la app recién instalada**. El prestador ya
fue dado de alta por la coordinación; recibe por **llamada o WhatsApp** un
**código de activación de 8 dígitos** (se muestra agrupado: `4829-1573`).

- Pantalla **"Activar mi teléfono"**: una instrucción simple + un campo de
  código grande con **teclado numérico** y autoformato en dos grupos de 4 +
  botón **"Activar"** grande.
- Botón **secundario** "Escanear QR" (alternativa para el caso presencial; el
  código es el mecanismo principal — diseñarlo como camino primario).
- Pantalla de **éxito**: "Hola, {nombre}. Tu teléfono quedó activado." → entra
  directo a la app operativa.
- Errores posibles a comunicar con claridad (cada uno con su mensaje y su
  salida): código incorrecto, vencido, ya usado, revocado, o "este teléfono ya
  está vinculado a otro prestador".

El código y el QR vinculan teléfono ↔ prestador. Vencen (default 24 h) y son de
un solo uso.

### 3.2 Reingreso (sesiones siguientes)

Una vez activado, el teléfono queda vinculado. En aperturas posteriores el
prestador entra con su **acceso** (no vuelve a activar). Diseñar un login
simple y un estado "sesión iniciada" persistente — no debería tener que
loguearse todos los días.

### 3.3 Mis servicios de hoy

Pantalla principal una vez dentro: **lista de los servicios asignados del día**.
Cada servicio muestra, en lo esencial:

- Persona a cuidar (nombre).
- Domicilio (dirección).
- Horario (inicio y fin).
- Estado de la asignación (ver §4).

Si no hay servicios hoy, un estado vacío claro y tranquilo ("No tenés
servicios asignados para hoy").

### 3.4 Servicio actual / próximo

El detalle del servicio en foco (el que está por empezar o en curso): persona,
domicilio completo, horario, y el **mapa / ubicación del domicilio**. Es la
pantalla desde la que el prestador confirma su llegada.

### 3.5 Ventana de tracking GPS previa al servicio

**No hay tracking permanente.** El GPS se activa **solo desde ~45 min antes**
del inicio del servicio y se **corta automáticamente cuando el prestador
confirma "LLEGUÉ"**. Implicancias de diseño:

- Mientras la ventana está activa: **notificación visible** del sistema
  (foreground service) y, dentro de la app, un indicador claro de que se está
  compartiendo ubicación y por qué (camino a un servicio).
- Necesita una **divulgación de privacidad previa** y clara: explicar antes de
  pedir el permiso de ubicación que el seguimiento es acotado, temporal y solo
  para el servicio. Esto es requisito de Google Play / App Store.
- Fuera de esa ventana, la app **no** sigue al prestador y debe comunicarlo.

### 3.6 "LLEGUÉ" — confirmación de llegada (check-in)

El **acto central de la app**. Al llegar al domicilio, el prestador toca un
botón grande **"LLEGUÉ"**. El sistema valida que esté dentro de la **geocerca**
(un radio permitido alrededor del domicilio, ~150 m por defecto).

- Caso normal: dentro del radio → confirmación inmediata, el tracking se corta.
- Caso excepción: fuera del radio o sin señal → permitir confirmar igual
  pidiendo un **motivo de excepción** (campo de texto breve), sin bloquear al
  prestador ni hacerlo sentir sospechoso.
- Diseñar este botón como el elemento más prominente de toda la app.

### 3.7 "FIN DE SERVICIO" — cierre (check-out)

Al terminar, el prestador toca **"Fin de servicio"**. Similar a "LLEGUÉ" pero
de cierre. Botón grande, claro, con confirmación.

### 3.8 Funcionamiento offline

Los eventos importantes ("LLEGUÉ", fin de servicio, puntos de ubicación) se
**guardan en el teléfono aunque no haya señal** y se sincronizan cuando vuelve
la conexión. La app nunca debe perder un "LLEGUÉ" por falta de internet.

- Mostrar de forma discreta el estado: "Guardado, se enviará al recuperar
  señal" / "Sincronizado".
- El reenvío es idempotente (no genera duplicados); el diseño solo necesita
  comunicar tranquilidad, no exponer reintentos.

### 3.9 Permisos

La app pide: **ubicación** (la más sensible — siempre con explicación previa),
**notificaciones push** y, posiblemente, exclusión de la optimización de
batería. Cada permiso necesita una pantalla/ explicación de *por qué* antes
del diálogo del sistema.

---

## 4. Conceptos del dominio que la UI muestra

### Estado de la asignación (servicio del prestador)

A lo largo del día una asignación pasa por estados. La app muestra el actual de
forma simple y con color:

`pendiente` → `próximo` → `en_camino` → `llegó` → `en_servicio` →
`finalizado`. Estados de problema: `en_riesgo`, `demorado`,
`ausente_probable`, `ausente`, `cancelado`.

### Nivel de riesgo (semáforo)

La coordinación trabaja con un semáforo de riesgo. En la app conviene un
lenguaje **positivo y tranquilizador**, no de vigilancia:

- **Verde** — todo en orden / llegada confirmada.
- **Amarillo** — se acerca la hora, conviene ponerse en camino.
- **Naranja** — atención, queda poco tiempo / estás lejos.
- **Rojo** — la hora pasó sin confirmar llegada.

El motor de riesgo del backend es automático; la app solo refleja el estado.
El tono hacia el prestador es de **apoyo y recordatorio**, nunca acusatorio.

### Geocerca

Cada domicilio tiene un punto y un **radio permitido**. "Estar en el radio" es
lo que valida un "LLEGUÉ" normal. Útil mostrarlo en el mapa del servicio.

---

## 5. Resumen de pantallas a diseñar (MVP)

1. **Activar mi teléfono** (código de 8 dígitos) + variante "Escanear QR".
2. **Activación exitosa** ("Hola, {nombre}").
3. **Login** de reingreso.
4. **Mis servicios de hoy** (lista) + estado vacío.
5. **Detalle del servicio** actual/próximo (con mapa del domicilio).
6. **Permisos** (ubicación, notificaciones) con explicación previa.
7. **Estado de tracking activo** (compartiendo ubicación, camino al servicio).
8. **LLEGUÉ** — confirmación de llegada (normal y excepción con motivo).
9. **Fin de servicio** — cierre.
10. **Estados de sincronización / sin conexión** (transversales).
11. **Mensajes de error** del flujo de activación.

---

## 6. Restricciones técnicas

- **Framework:** Flutter (Android e iOS; el grueso del público es Android de
  gama media/baja — diseñar mobile-first para esa realidad).
- **Backend:** API REST con sesión JWT; push por Firebase Cloud Messaging;
  mapas con Google Maps Platform.
- **Idioma de la interfaz:** español rioplatense, registro claro y respetuoso.
- **Modo offline-first** en los eventos operativos.

---

## 7. Principios de diseño — checklist rápido

- [ ] ¿Esta pantalla tiene **una sola** acción principal evidente?
- [ ] ¿El botón principal es **grande** y se entiende sin leer?
- [ ] ¿Se lee **bajo el sol** y se opera **con una mano**?
- [ ] ¿El texto está en **lenguaje llano**, sin tecnicismos?
- [ ] ¿Funciona y comunica bien **sin conexión**?
- [ ] ¿El tono es de **apoyo**, nunca de vigilancia ni de reto?
- [ ] ¿Es **liviano** (sin animaciones ni recursos pesados)?
