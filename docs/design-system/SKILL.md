---
name: nareapp-design
description: Use this skill to generate well-branded interfaces and assets for NareApp (app del prestador para servicios domiciliarios de cuidado en Argentina), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Includes obligatory Spanish-language nomenclature rules (prestador, servicio asignado, coordinación) that MUST be respected.
user-invocable: true
---

# NareApp Design Skill

Read the **README.md** file within this skill first — it contains the full brand context (Argentine home-care services platform), the obligatory **nomenclature rules** (prestador vs. empleada, coordinación vs. RRHH, etc.), the visual foundations, and the content guidelines.

Then explore the other available files:

- `colors_and_type.css` — design tokens (color, type scale, spacing, radii, shadow, motion). Import this in any HTML prototype.
- `assets/` — logos (`logo.svg`, `logo-mono-dark.svg`, `logo-mono-light.svg`, `logomark.svg`, `app-icon.svg`).
- `fonts/` — fonts ship via Google Fonts (`@import` in `colors_and_type.css`).
- `preview/` — small Design System cards (type, colors, spacing, components, brand).
- `ui_kits/nareapp-mobile/` — full React/JSX UI kit:
  - `index.html` — clickable prototype (vinculación por QR → dispositivo vinculado → servicio actual → llegué → fin de servicio → mapa → servicios → cuenta → privacidad).
  - `components.jsx` — `StatusPill`, `CriticalButton`, `PrimaryButton`, `SecondaryButton`, `TopBar`, `TabBar`, `ServiceCard`, `Banner`, `BottomSheet`, `TextField`, `FauxMap`.
  - `screens.jsx` — full screens.
  - `icons.jsx` — Lucide-style icons.

## When producing artifacts

- **Slides / mocks / throwaway prototypes:** copy `colors_and_type.css` and the `assets/` you need into the new HTML file's project, and build static HTML. Always wrap mobile mocks in an Android device frame (see `ui_kits/nareapp-mobile/index.html` for a tested one).
- **Production code (Flutter / React Native):** lift the color tokens, type scale, and component logic from `components.jsx`. The platform decision (Flutter vs RN) is open — favor Flutter for tighter Android battery + GPS control on gama media/baja.

## Hard rules

- **Nomenclatura obligatoria.** Always: *prestador, cuidado, prestación de servicio, servicio asignado, coordinación, cobertura, ausencia, tardanza, reemplazo*. **Never:** *empleada, trabajadora, relación de dependencia*. Same for verbs/screens: "llegué" not "check-in", "fin de servicio" not "check-out", "coordinación" not "RRHH".
- **No emoji** in functional UI.
- **No tracking 24/7.** Any GPS UI must clearly state the window (ventana pre-servicio que termina al confirmar `LLEGUÉ`).
- **One critical action per screen.** `LLEGUÉ` is the only coral button in the system.
- **Minimum text size 14px.** Critical buttons 64px tall.

## If invoked without context

Ask the user:
1. ¿Qué pantalla o flujo querés diseñar? (login, servicio actual, mapa, fin de servicio, lista de servicios, cuenta, privacidad, notificación push, etc.)
2. ¿Es un mock estático (HTML), un prototipo clickeable, o código de producción (Flutter/React Native)?
3. ¿Querés variaciones? ¿Sobre qué eje (visuales, layout, copy)?
4. ¿Hay un estado específico del servicio para mostrar? (pendiente, próximo, en riesgo, llegué, en servicio, finalizado, ausente, demorado, pendiente de sincronización)

Then act as an expert designer who outputs HTML artifacts *or* production code, depending on the need — always respecting the nomenclatura and visual foundations above.
