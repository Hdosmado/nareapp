# NareApp Mobile — UI Kit

Pixel-fidelity prototype of the **app del prestador** (asistente terapéutico, supervisor, auditor médico, enfermero, cuidadora). Built from the brief — no codebase or Figma was provided. All decisions follow `../../colors_and_type.css` and the brand foundations in `../../README.md`.

## Run

Open `index.html`. It uses inline JSX (Babel standalone) — no build step.

## Files

| File | What |
|---|---|
| `index.html` | Interactive prototype (single phone, navigable). |
| `icons.jsx` | Lucide-style line icons (1.5px, currentColor). |
| `components.jsx` | `StatusPill`, `CriticalButton`, `PrimaryButton`, `SecondaryButton`, `GhostButton`, `TopBar`, `TabBar`, `ServiceCard`, `Banner`, `BottomSheet`, `TextField`, `FauxMap`, `SectionHeader`. |
| `screens.jsx` | `QrScanScreen`, `ManualCodeScreen`, `DeviceLinkedScreen`, `PendingApprovalScreen`, `TodayScreen`, `MapScreen`, `ServicesScreen`, `AccountScreen`, `PrivacyScreen`, `ArrivalSheet`, `EndSheet`. |
| `android-frame.jsx` | Material 3 device frame (starter — kept available but the prototype renders its own simplified Android chrome that matches the NareApp visual). |

## Flow covered

1. **Vinculación por QR** (`QrScanScreen`) — pantalla de entrada. Coordinación genera un QR **fuera de la app** que valida el `deviceId`. El prestador apunta la cámara y queda vinculado. No hay usuario/contraseña.
2. **Código manual** (`ManualCodeScreen`) — fallback si la cámara no funciona. 8 caracteres, letras + números.
3. **Dispositivo vinculado** (`DeviceLinkedScreen`) — splash de éxito con el nombre del prestador y su ID. Auto-avanza a "Servicio actual".
4. **Aprobación pendiente** (`PendingApprovalScreen`) — estado raro: el QR se escaneó pero el backend todavía no confirmó. Se muestra mientras se sincroniza.
5. **Servicio actual** (`TodayScreen`) — pantalla principal. Persona, domicilio, horario, estado y los botones `LLEGUÉ` / `FIN DE SERVICIO`.
6. **Confirmar llegada** — bottom sheet con scrim. Variante "fuera de radio" pide motivo.
7. **En servicio** — mismo `TodayScreen` con estado `llegué` + banner success. Aparece `FIN DE SERVICIO`.
8. **Fin de servicio** — bottom sheet de confirmación.
9. **Mapa** — `FauxMap` placeholder de Google Maps embebido + deep link.
10. **Servicios** — lista agrupada por "Hoy" / "Próximos".
11. **Cuenta** — perfil, estado de dispositivo, sync, links a privacidad y **desvincular** (no "cerrar sesión" — fuerza re-escaneo de QR).
12. **Privacidad** — texto literal aprobado para stores.

## Decisiones visuales clave

- **`LLEGUÉ` en coral** — único uso del color crítico, refuerza la jerarquía.
- **`FIN DE SERVICIO` en teal-700** — primario, secundario en importancia visual.
- **Botones primarios 64px de alto** — hit target generoso para uso bajo sol.
- **Tab bar de 3 items** — Hoy · Servicios · Cuenta.
- **Mapa** se renderiza como placeholder (`FauxMap`) — en producción se reemplaza por Google Maps embebido.

## Limitaciones

- **No es producción.** No hay backend real, GPS, push, ni persistencia.
- **Sin animaciones complejas** — sólo la transición de bottom sheet y el press scale.
- **Diseño desde cero** — sin codebase ni Figma. Revisar antes de pasar a Flutter/RN.
