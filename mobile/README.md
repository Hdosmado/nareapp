# NareApp Mobile — app del prestador

App Flutter del **prestador** de cuidado domiciliario. Permite activar el
teléfono con un código de coordinación, ver el servicio asignado, confirmar la
llegada al domicilio (`LLEGUÉ`) y el fin del servicio (`FIN DE SERVICIO`), y
aportar GPS operativo previo para que coordinación anticipe demoras.

Se conecta al backend NestJS del repositorio (`../backend`).

---

## Requisitos

- **Flutter** 3.44 o superior (canal stable) con el SDK de Dart incluido.
- **Android SDK** con `platform-tools` y una plataforma `android-35`/`android-36`.
- **JDK 17** (lo usa Gradle).
- Un teléfono Android o un emulador para instalar el APK.
- Para iOS: macOS con Xcode 15+ y CocoaPods. No buildable en WSL/Linux.

Verificá el entorno con:

```bash
flutter doctor
```

---

## Configuración de la URL del backend

La app habla con el backend bajo el prefijo `/api`. La URL **base** se inyecta
en tiempo de compilación con `--dart-define`:

```bash
--dart-define=BACKEND_URL=http://IP_DE_TU_RED_LOCAL:3000
```

- El valor por defecto es `http://192.168.1.100:3000`. **Cambialo por la IP de
  la máquina donde corre el backend.**
- No uses `localhost`: un teléfono físico resuelve `localhost` contra sí mismo,
  no contra tu computadora.
- Para conocer la IP de tu red local:
  - Linux / macOS: `ip addr` o `ifconfig` (interfaz `wlan0`/`en0`).
  - Windows: `ipconfig` (campo "Dirección IPv4").
- El backend debe escuchar en esa interfaz y el teléfono estar en la misma red
  Wi-Fi.

> El backend de desarrollo corre por HTTP plano. El `AndroidManifest.xml` ya
> habilita `usesCleartextTraffic` para permitirlo en builds de debug.

---

## Build del APK de debug

Desde esta carpeta (`mobile/`):

```bash
flutter pub get
flutter build apk --debug --dart-define=BACKEND_URL=http://IP_LOCAL:3000
```

El APK queda en:

```
build/app/outputs/flutter-apk/app-debug.apk
```

Instalalo en un teléfono conectado por USB con:

```bash
flutter install --debug
# o bien
adb install build/app/outputs/flutter-apk/app-debug.apk
```

## Ejecutar en modo desarrollo

```bash
flutter run --dart-define=BACKEND_URL=http://IP_LOCAL:3000
```

## Análisis y pruebas

```bash
flutter analyze   # análisis estático — sin issues
flutter test      # pruebas unitarias de la lógica de dominio
```

---

## Arquitectura

Capas, de adentro hacia afuera:

```
lib/
  core/        Tema (design system), constantes, utilidades, configuración.
  data/
    models/        Modelos de dominio (Assignment, AuthSession, ...).
    api/           ApiClient (Dio): JWT, header X-Device-Id, refresh ante 401.
    storage/       Almacenamiento seguro del JWT y cola offline local.
    repositories/  Un repositorio por área del backend.
  services/    Plataforma: ubicación (GPS), conectividad, identidad, push.
  state/       Controladores Riverpod (sesión, servicios, sync, tracking).
  ui/
    widgets/   Componentes del design system (botones, pills, sheets, ...).
    screens/   Pantallas, agrupadas por flujo.
```

- **Estado:** Riverpod (`Notifier` / `AsyncNotifier`).
- **HTTP:** Dio, con interceptor que adjunta el `Bearer` token y el header
  `X-Device-Id`, y renueva la sesión automáticamente ante un `401`.
- **Sesión:** el par de tokens JWT se guarda cifrado (`flutter_secure_storage`).
- **Offline-first:** cada evento operativo (llegada, fin de servicio, ubicación
  previa) se persiste local apenas se genera. Si hay red se entrega al
  instante por su endpoint directo; si no, queda en cola y se sincroniza vía
  `POST /sync/events` con su clave de idempotencia cuando la conexión vuelve.

## Activación

La pantalla inicial es **"Activar mi teléfono"**: el prestador ingresa el
**código numérico de 8 dígitos** que le pasó coordinación (autoformato
`4829-1573`, teclado numérico). El **escaneo de QR** queda como mecanismo
secundario. La app nunca crea cuentas: el prestador ya existe en el panel.

## Endpoints del backend que consume

| Acción | Endpoint |
|---|---|
| Activar el teléfono | `POST /api/mobile/activation/claim` |
| Login de reingreso | `POST /api/auth/login` |
| Renovar sesión | `POST /api/auth/refresh` |
| Servicios de hoy | `GET /api/assignments/today` |
| Servicio actual | `GET /api/assignments/current` |
| Confirmar llegada | `POST /api/assignments/:id/check-in` |
| Fin de servicio | `POST /api/assignments/:id/check-out` |
| Ubicación previa | `POST /api/assignments/:id/pre-service-location` |
| Sincronización offline | `POST /api/sync/events` |
| Configuración operativa | `GET /api/mobile/config` |
| Registro de push | `POST /api/push/register-token` |

## Permisos de Android

- `INTERNET` — conexión con el backend.
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — ubicación.
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION` / `POST_NOTIFICATIONS`
  — foreground service de la ventana de tracking previo, con notificación
  visible. El GPS **no** corre de forma permanente: solo en la ventana previa
  al servicio, y se detiene al confirmar la llegada.
- `CAMERA` — escaneo del QR de activación.

## Build iOS

La estructura `ios/` se generó con `flutter create --platforms=ios .`. El
bundle id es `ar.com.nareapp.nareappMobile`. El `Info.plist` ya declara los
permisos de ubicación (`NSLocationWhenInUseUsageDescription` y
`NSLocationAlwaysAndWhenInUseUsageDescription`) y los background modes
necesarios (`location` y `remote-notification`).

Pasos para buildear iOS (necesita macOS con Xcode):

```bash
cd ios
pod install   # solo la primera vez o tras cambiar deps
cd ..
flutter build ios --no-codesign   # validación sin firmar
```

Para producción hace falta firmar con un certificado del equipo Apple
Developer (configurar `DEVELOPMENT_TEAM` en `Runner.xcodeproj` desde
Xcode → Signing & Capabilities).

## Servicios externos

- **Firebase Cloud Messaging:** `firebase_core` + `firebase_messaging`
  integrados. Las credenciales (`lib/firebase_options.dart`,
  `android/app/google-services.json`, `ios/Runner/GoogleService-Info.plist`)
  son *placeholders* válidos sólo para que la app compile. Antes de subir
  a producción, regenerarlos con FlutterFire CLI:

  ```bash
  dart pub global activate flutterfire_cli
  flutterfire configure --project=<firebase-project-id>
  ```

  Hasta entonces, `FirebaseMessaging.getToken()` devuelve `null` y la app
  sigue operativa sin push.
- **Google Maps:** `google_maps_flutter` embebido en la pantalla "Cómo
  llegar". Muestra el marker del domicilio y, si tenemos permiso de
  ubicación, la posición actual del prestador. La API key se inyecta en
  build:

  ```bash
  # Android
  flutter build apk \
    -P MAPS_API_KEY=AIza...real... \
    --dart-define=BACKEND_URL=...

  # iOS (en macOS)
  flutter build ios \
    --dart-define=GOOGLE_MAPS_API_KEY=AIza...real...
  ```

  Sin API key, el mapa carga pero pinta la marca "For development
  purposes only". El botón "Abrir Google Maps" sigue funcionando como
  fallback con deep link `geo:` independientemente de la API key.
