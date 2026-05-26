// IMPORTANTE: Este archivo es un *placeholder* válido sólo para que la app
// compile mientras no se haya creado el proyecto real de Firebase.
//
// Para producción, regenerarlo con FlutterFire CLI:
//   dart pub global activate flutterfire_cli
//   flutterfire configure --project=<project-id>
//
// Eso reemplaza este archivo y `android/app/google-services.json`/
// `ios/Runner/GoogleService-Info.plist` por las credenciales reales del
// proyecto. Sin reemplazo, `Firebase.initializeApp` resuelve pero
// `FirebaseMessaging.getToken()` devuelve `null` (no hay APNs/GCM linkeado).
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Opciones por plataforma para inicializar Firebase.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'NareApp no se ejecuta en web; no hay configuración Firebase web.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'Plataforma no soportada: $defaultTargetPlatform',
        );
    }
  }

  /// Stub Android. Reemplazar con `flutterfire configure`.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'stub-android-api-key',
    appId: '1:000000000000:android:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'nareapp-stub',
    storageBucket: 'nareapp-stub.appspot.com',
  );

  /// Stub iOS. Reemplazar con `flutterfire configure`.
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'stub-ios-api-key',
    appId: '1:000000000000:ios:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'nareapp-stub',
    storageBucket: 'nareapp-stub.appspot.com',
    iosBundleId: 'ar.com.nareapp.nareappMobile',
  );
}
