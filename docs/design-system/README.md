# NareApp — Design System

> Sistema de diseño para **NareApp Mobile**, la app del *prestador* — una herramienta simple, robusta y publicable para asistentes terapéuticos, supervisores, auditores médicos, enfermeros y cuidadoras que prestan servicios domiciliarios de cuidado, asistencia y supervisión en Argentina (Rosario, Santa Fe, Córdoba, Paraná y Buenos Aires).

## Producto

**NareApp Mobile (app del prestador).** Permite al prestador ver su servicio actual o próximo, confirmar llegada al domicilio (`LLEGUÉ`) y fin de servicio (`FIN DE SERVICIO`), y aporta GPS operativo previo para que **coordinación** anticipe tardanzas y ausencias.

**No es** una app de liquidación ni de facturación. **No hay** tracking 24/7 — el GPS sólo se activa antes del inicio de un servicio y se detiene al confirmar llegada.

## Audiencia

- Prestadores con **bajo nivel de experiencia digital**.
- Teléfonos **Android de gama media/baja** mayoritariamente.
- Conectividad irregular; necesidad de offline.
- Castellano rioplatense, registro respetuoso y profesional.

## Fuentes y materiales

Este proyecto se inició **sin** codebase, sin Figma y sin assets visuales adjuntos — solo el brief funcional. Todo el sistema visual fue construido desde cero respetando las restricciones de UX y la **nomenclatura obligatoria**:

- ✅ Usar: *prestador, cuidado, prestación de servicio, servicio asignado, coordinación, cobertura, ausencia, tardanza, reemplazo*.
- 🚫 Nunca usar: *empleada, trabajadora, relación de dependencia*.

Si más adelante se incorpora codebase Flutter/React Native, Figma o branding existente de la empresa, este sistema debe actualizarse para reflejar las decisiones reales (logo definitivo, paleta de marca, tipografía corporativa, etc.).

---

## Índice del repositorio

```
README.md                  ← este archivo
colors_and_type.css        ← variables CSS base + tokens semánticos
fonts/                     ← webfonts (Bricolage Grotesque, Plus Jakarta Sans)
assets/                    ← logos, marcas, ilustraciones
preview/                   ← cards del Design System (tipo, color, spacing, componentes)
ui_kits/
  nareapp-mobile/
    README.md
    index.html             ← prototipo clickeable del flujo prestador
    *.jsx                  ← componentes (StatusPill, ServiceCard, BigButton, etc.)
```

---

## CONTENT FUNDAMENTALS

### Idioma y registro

- **Castellano rioplatense**, profesional pero cercano. Sin formalismo excesivo. Sin "vos" en UI (queda más universal); sí imperativos directos: *Confirmá*, *Tocá para abrir*.
- **Tuteo en mensajes contextuales** (`Tu dispositivo está pendiente de aprobación`), nunca "Usted".
- Frases **cortas**, sin subordinadas. Una idea por línea.
- **Nomenclatura obligatoria** (ver arriba). Esto es legal/de marca, no estilístico.

### Tono

- **Operativo, no emocional.** No celebramos llegadas con "¡Buen trabajo!". Decimos "Llegada registrada".
- **Confiable y serio**, sin ser frío. La app trabaja con cuidado de personas — la copy respeta eso.
- **Anti-pánico.** Cuando algo falla (sin GPS, sin red, fuera de radio), el mensaje explica qué pasa, qué hacer y que el dato se va a guardar.

### Casing y puntuación

- **Títulos de pantalla:** Sentence case (`Mis servicios`, `Servicio actual`).
- **Botones primarios de acción crítica:** MAYÚSCULAS (`LLEGUÉ`, `FIN DE SERVICIO`, `ABRIR GOOGLE MAPS`). Es la única convención de mayúsculas — refuerza la jerarquía operativa.
- **Botones secundarios:** Sentence case (`Ver mapa`, `Ver detalle`).
- **Etiquetas de estado:** lowercase tokens (`pendiente`, `en servicio`, `finalizado`, `en riesgo`, `demorado`, `ausente`).
- **Sin punto final** en títulos, etiquetas ni botones. Sí en mensajes de varias oraciones.

### Vocabulario de microcopy

| Concepto | Decimos | No decimos |
|---|---|---|
| La persona que presta el servicio | prestador / la prestadora | empleada, empleado, trabajadora |
| La persona cuidada | persona a cuidar | paciente, cliente, beneficiario |
| El trabajo asignado | servicio asignado, prestación | turno, shift, jornada |
| Llegada | confirmar llegada, llegué | check-in, fichada |
| Salida | fin de servicio | check-out, cierre |
| Quien gestiona desde la central | coordinación | RRHH, admin, oficina |
| Falta no avisada | ausencia | falla, no-show |
| Llegar tarde | tardanza, demora | retraso, atraso |
| Cubrir un servicio que el titular no puede | reemplazo, cobertura | suplencia, backup |

### Ejemplos de mensajes

- ✅ `Tu dispositivo está pendiente de aprobación por coordinación.`
- ✅ `Estás fuera del radio del domicilio. ¿Querés confirmar la llegada de todas formas?`
- ✅ `Sin conexión. Vamos a guardar la llegada y enviarla cuando vuelva la señal.`
- ✅ `Llegada registrada — 10:47.`
- ❌ `¡Ups! Algo salió mal 😬` *(emoji, tono casual, no informa)*
- ❌ `Check-in exitoso` *(anglicismo, no usa "llegada")*

### Emoji

- **No usar emoji** en UI funcional. La app es operativa y se publica en stores de salud — el registro debe ser profesional.
- Se permiten **íconos vectoriales** (ver `ICONOGRAPHY`) y, excepcionalmente, **glifos Unicode neutros** (·, →, ✓, ✕) en contextos muy específicos.

---

## VISUAL FOUNDATIONS

### Paleta

Sistema construido sobre **dos ejes**: un teal profundo (`--teal-700`) como color de marca + confianza médica, y una arena cálida (`--sand-50`/`--sand-100`) como fondo base — más humano que el blanco puro, más legible bajo sol intenso (uso frecuente en exterior, camino al domicilio).

- **Marca / Primario:** `--teal-700 #0E5C5C`. Llama a calma, salud, profesionalismo. Lejos del azul "tech" genérico.
- **Acción crítica:** `--coral-600 #D9533B` se reserva **únicamente** para el botón `LLEGUÉ` (acción más importante de la app) y para errores graves. La rareza es la jerarquía.
- **Neutros cálidos:** la familia `--ink` (textos) e `--sand` (fondos) están sesgadas a warm — evitan el aspecto clínico estéril.
- **Semánticos de estado:** un color por estado del servicio (pendiente, próximo, en riesgo, en servicio, finalizado, ausente, demorado, pendiente de sincronización). Diseñados para ser **distinguibles en daltonismo** (no solo color — siempre acompañados de etiqueta y forma).

### Tipografía

- **Display:** [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque). Geométrica con personalidad, optical sizing variable, se ve bien en grande. Para encabezados de pantalla y números operativos (hora de inicio, etc.).
- **UI / Body:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans). Humana, redonda, **altamente legible en pantallas Android de baja densidad**. Carga cognitiva baja.
- **Mono:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) sólo para datos técnicos (deviceId, idempotencyKey en pantalla de debug/sync).

**Tamaño mínimo: 14px.** El cuerpo base de la app es **16px**; los botones primarios alcanzan **20–22px**. Los usuarios pueden ser personas mayores o trabajando bajo sol.

⚠️ **Substitución:** las tres familias se cargan desde Google Fonts. Si la empresa tiene una tipografía corporativa, reemplazar y revisar tamaños.

### Espaciado y layout

- **Sistema 4pt.** Tokens: `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-5` (24px), `--space-6` (32px), `--space-7` (48px), `--space-8` (64px).
- **Padding de pantalla:** 20px horizontal en mobile.
- **Hit targets mínimos: 48×48px.** Botones primarios: **64px de alto**. `LLEGUÉ` y `FIN DE SERVICIO` ocupan el ancho completo con padding lateral de 20px.
- **Una acción dominante por pantalla.** Si hay dos, jerarquía visual clara (peso, color).

### Fondos

- **Sin gradientes elaborados.** Fondo base `--sand-50` (#F7F4EE) o blanco quebrado. Las pantallas críticas usan **un solo color sólido** para no competir con el contenido.
- **Sin imágenes full-bleed** en la app del prestador — distraen y consumen batería/datos.
- **Mapa embebido** es el único elemento "rico" — se trata como una superficie funcional, no decorativa.

### Bordes y esquinas

- **Radio:** `--radius-sm 8px` (chips, inputs), `--radius-md 14px` (cards), `--radius-lg 20px` (botones primarios, modales), `--radius-pill 999px` (status pills).
- **Bordes:** 1px sólido `--ink-200` en cards y separadores. Sin border-only colored accents.

### Sombras

Mínimas — los Android de gama baja renderizan sombras costosas. Dos niveles:

- `--shadow-sm`: `0 1px 2px rgba(20, 20, 20, 0.06)` — cards.
- `--shadow-md`: `0 4px 14px rgba(20, 20, 20, 0.08)` — botones primarios elevados, sheets.

No usamos shadows internas, glow, ni efectos neumórficos.

### Estados de interacción

- **Hover (web/preview):** oscurecimiento del 4% — no se usa en la app real (no hay hover en mobile).
- **Press / tactile:** **scale(0.97)** + transición 80ms ease-out. Es lo único que se anima en interacciones — feedback inmediato, sin distracciones.
- **Disabled:** opacity 0.4. Mantiene la forma del botón visible para no confundir.
- **Focus:** ring 2px `--teal-500` con offset 2px. Importante para accesibilidad.

### Animación

- **Mínima por filosofía y por batería.** Transiciones de pantalla: 180ms ease-out, fade + 8px slide.
- **Sin bouncing, sin parallax, sin spring.** El contexto (cuidado de personas) pide seriedad.
- **Skeleton loaders** sutiles para data en carga; nada de spinners decorativos.

### Transparencia y blur

- Casi nunca. La única excepción: el **bottom sheet de confirmación** ("Llegada registrada") usa un scrim `rgba(20, 20, 20, 0.4)` sobre el contenido.
- **No** se usa `backdrop-filter: blur()` en producción — costoso en Android gama baja.

### Imágenes

- La app del prestador **no usa fotografía**. El branding y marketing pueden incluirla; allí, paleta **cálida** (warm cast), **luz natural**, gente real (no stock genérico), foco en manos / contacto / domicilios reales. Nunca clínicos blancos.

### Capa "fija" y jerarquía

- **Top bar:** título de pantalla a la izquierda, una sola acción a la derecha. Altura 56px.
- **Bottom action:** botones críticos (`LLEGUÉ`, `FIN DE SERVICIO`) fijos al borde inferior con padding safe-area. Esto garantiza que el dedo del prestador siempre llegue.
- **Tab bar:** 3 ítems máximo (Hoy · Servicios · Cuenta).

### Cards

- Fondo `--sand-0` (blanco), borde 1px `--ink-200`, radio 14px, padding 16–20px.
- Sombra `--shadow-sm` solamente cuando flotan sobre otro card o un mapa.
- Sin gradientes ni left-border colored accents.

### Iconografía

Ver sección [Iconografía](#iconography) más abajo.

---

## ICONOGRAPHY

- **Set:** [Lucide](https://lucide.dev/) — íconos line-style, 1.5px stroke, esquinas redondeadas, gratuitos y consistentes. Se carga via CDN en preview/UI kit; en producción se debe incluir vía `lucide-react` o `lucide-flutter`.
- **Tamaño base:** 20px (UI), 24px (botones y headers), 18px en chips/pills.
- **Color:** hereda `currentColor` — los íconos toman el color del texto que los acompaña. Nunca íconos a color.
- **Stroke peso:** 1.5px estándar. Para botones primarios sobre fondo de color, 2px para mejor lectura.
- **Sin íconos rellenos (filled)** salvo el ícono de "servicio en curso" (un dot relleno) y los pins de mapa.

### Íconos usados en la app

| Pantalla / acción | Lucide name |
|---|---|
| Llegada / check-in | `map-pin-check` |
| Fin de servicio | `square-check-big` |
| Mapa embebido | `map` |
| Abrir Google Maps | `external-link` |
| Estado pendiente | `clock` |
| En riesgo / demorado | `alert-triangle` |
| Ausente | `circle-x` |
| Finalizado | `check` |
| Pendiente de sincronización | `cloud-upload` (animado lento) |
| Notificaciones | `bell` |
| Servicios | `calendar-days` |
| Cuenta / sesión | `user-round` |
| Cerrar sesión | `log-out` |
| Privacidad | `shield` |

### Emoji y unicode

- **Emoji:** ❌ No.
- **Unicode glifos:** sólo `·` (separador entre meta-datos: `Rosario · Santa Fe`), `→` ocasional en flujos.

### Logo

`assets/logo.svg` — wordmark "**nare**" en Bricolage Grotesque, con un punto sobre la "n" que evoca un pin de ubicación. Variantes:

- `logo.svg` — completo, color marca.
- `logo-mono-dark.svg` — sobre fondos claros, ink-900.
- `logo-mono-light.svg` — sobre fondos oscuros, sand-0.
- `logomark.svg` — solo el pin sobre la "n" (favicon, app icon base).

⚠️ Logo creado desde cero — reemplazar con asset oficial cuando esté disponible.
