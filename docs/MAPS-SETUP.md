# Google Maps — setup paso a paso

La app mobile usa **`google_maps_flutter`** en la pantalla "Cómo llegar"
(mapa con marker del domicilio y deep link a Google Maps). Si el contenedor
del mapa aparece **gris con solo el logo "Google"** o renderiza tiles con el
texto "For development purposes only", el problema es **siempre uno de
estos dos**:

1. La API "Maps SDK for Android" (o "Maps SDK for iOS") **no está habilitada**
   en el proyecto de Google Cloud que provee la API key.
2. La key **no se está pasando** en el build (placeholder vacío).

Esta guía deja la app operativa con el menor scope.

---

## 1) Habilitar la API en Google Cloud

Proyecto actual de Firebase: **`nareapp-8fc29`**. Las APIs de Maps viven en
la misma consola de Google Cloud que ese proyecto.

1. Abrir <https://console.cloud.google.com/> y seleccionar el proyecto
   `nareapp-8fc29` arriba a la izquierda.
2. Menú lateral → **APIs y servicios** → **Biblioteca**.
3. Buscar y habilitar:
   - **Maps SDK for Android** (obligatorio para que la app mobile actual
     renderice tiles).
   - **Maps SDK for iOS** (solo si se va a buildear iOS).

Sin estas APIs habilitadas, **aunque la key exista**, Google devuelve
"For development purposes only" sobre las tiles.

---

## 2) Crear la API key

1. Menú lateral → **APIs y servicios** → **Credenciales**.
2. Click en **Crear credenciales** → **Clave de API**.
3. Copiar la key (formato `AIzaSy…`, ~39 caracteres).
4. Click en el lápiz de edición de la key recién creada para restringirla
   (paso siguiente).

### Restringir la key (recomendado)

**Sin restringir** la key funciona pero queda expuesta — cualquiera que la
encuentre puede consumir tu cuota. Para restringirla:

#### Restricciones de aplicación

Seleccionar **Apps para Android** y agregar un registro:

- Nombre del paquete: `ar.com.nareapp.nareapp_mobile`
- Huella digital del certificado SHA-1: ver siguiente sub-paso.

##### Obtener la SHA-1 del debug keystore

Desde Linux/WSL (con JDK 17 cargado vía `source ~/sdks/env.sh`):

```bash
keytool -list -v \
  -alias androiddebugkey \
  -keystore ~/.android/debug.keystore \
  -storepass android \
  -keypass android | grep SHA1
```

Si todavía no existe `~/.android/debug.keystore`, se crea
automáticamente al primer `flutter run` debug. Si no hay forma de
correrlo, también podés generarlo manualmente:

```bash
keytool -genkey -v \
  -keystore ~/.android/debug.keystore \
  -storepass android -alias androiddebugkey \
  -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

Para release también hay que agregar la SHA-1 del **upload key**, pero eso
queda para más adelante (no aplica al debug actual).

#### Restricciones de API

Seleccionar **Restringir clave** y marcar solo:

- **Maps SDK for Android**
- **Maps SDK for iOS** (si se buildea iOS con la misma key — o usar una
  key separada).

Guardar.

---

## 3) Pasar la key al build

### Android (debug / release)

La key entra por `manifestPlaceholders["MAPS_API_KEY"]` en
`mobile/android/app/build.gradle.kts`, que la lee de un property de
Gradle o de la variable de entorno `MAPS_API_KEY` (en ese orden).

```bash
# Run sobre dispositivo/emulador (debug):
flutter run -P MAPS_API_KEY=AIzaSy_TU_KEY

# Build APK (debug):
flutter build apk --debug -P MAPS_API_KEY=AIzaSy_TU_KEY

# Build APK (release):
flutter build apk --release -P MAPS_API_KEY=AIzaSy_TU_KEY
```

Equivalente con env var:

```bash
export MAPS_API_KEY=AIzaSy_TU_KEY
flutter run
```

**Verificación rápida.** Tras buildear, podés confirmar que la key quedó
inyectada inspeccionando el AndroidManifest del APK:

```bash
# Requiere apkanalyzer del Android SDK
apkanalyzer manifest print build/app/outputs/flutter-apk/app-debug.apk \
  | grep -A1 com.google.android.geo.API_KEY
```

### iOS

`mobile/ios/Runner/AppDelegate.swift` lee del Info.plist la entrada
`MAPS_API_KEY`, que en `Info.plist` está como `$(MAPS_API_KEY)`. Xcode
resuelve ese placeholder desde una **User-Defined Build Setting** del
target Runner.

Setup una vez:

1. Abrir `mobile/ios/Runner.xcworkspace` en Xcode.
2. Seleccionar el target `Runner` → **Build Settings** → **+** →
   **Add User-Defined Setting** → nombre `MAPS_API_KEY` → valor
   `AIzaSy_TU_KEY`.
3. Build.

Para CI/CD se hace lo mismo via xcconfig (`xcconfig` propio o el plugin
de `flutter_dotenv` — fuera de scope de este doc).

---

## 4) Verificar visualmente

1. Buildear y correr la app con la key inyectada.
2. Activar la app con un código de prueba (`bash backend/scripts/seed-demo.sh`
   crea uno).
3. Ir a un servicio del día → tocar **"Cómo llegar"**.
4. **OK:** el mapa renderiza tiles con calles legibles, marker en el domicilio.
5. **NO OK:** mapa gris con solo el logo "Google" → key faltante o API no
   habilitada (volver al paso 1).
6. **NO OK:** tiles con marca "For development purposes only" cruzando la
   pantalla → API "Maps SDK for Android" no habilitada en el proyecto del
   key (volver al paso 1).

---

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| Mapa gris, logo Google centrado | Key vacía o no inyectada. Verificar con `apkanalyzer`. |
| Tiles con marca "For development" | API "Maps SDK for Android" no habilitada en el proyecto del key. |
| `Authorization failure` en logcat | Key existe pero está restringida y la SHA-1 del keystore actual no coincide. Reagregar la SHA-1 correcta. |
| Funciona en debug y falla en release | La SHA-1 del upload keystore no está en la lista de la key. |
