// Generado para el proyecto Firebase `nareapp-8fc29`.
//
// Para regenerar después de cambios en el proyecto Firebase, lo más cómodo es
// `flutterfire configure --project=nareapp-8fc29` (requiere `firebase login`
// interactivo). También se puede actualizar a mano con los valores de
// `firebase apps:sdkconfig ANDROID|IOS <app-id> --project=nareapp-8fc29`.
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

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCNyLFoQOLrHps6x2eLSp9ByPRat3LSJBs',
    appId: '1:795455427313:android:c94429f59c32f1d23c0f50',
    messagingSenderId: '795455427313',
    projectId: 'nareapp-8fc29',
    storageBucket: 'nareapp-8fc29.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBGbYQL8KCuWJS6Fp6338KxAiu9eqPsKHw',
    appId: '1:795455427313:ios:23ce8601e81aadcc3c0f50',
    messagingSenderId: '795455427313',
    projectId: 'nareapp-8fc29',
    storageBucket: 'nareapp-8fc29.firebasestorage.app',
    iosBundleId: 'ar.com.nareapp.nareappMobile',
  );
}
