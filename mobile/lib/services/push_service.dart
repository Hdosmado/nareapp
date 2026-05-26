import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Servicio de notificaciones push.
///
/// La implementación de producción usa Firebase Cloud Messaging: pide
/// permisos a la plataforma, obtiene el token del dispositivo y notifica al
/// caller cuando FCM lo rota. La interfaz se mantiene chica para que la app
/// pueda seguir corriendo con un stub en tests.
abstract class PushService {
  /// Inicializa el servicio (permisos, canales).
  Future<void> init();

  /// Token del dispositivo para push, o `null` si no se pudo obtener.
  Future<String?> obtainToken();

  /// Stream de tokens nuevos cuando FCM los rota.
  Stream<String> get tokenRefreshes;
}

/// Implementación real basada en `firebase_messaging`.
///
/// Si el proyecto de Firebase aún es el stub (sin `google-services.json`
/// real), `getToken()` devolverá `null` silenciosamente — la app sigue
/// operativa sin push. Cuando se reemplacen las credenciales por las del
/// proyecto productivo, esto pasa a devolver el token real sin recambio
/// de código.
class FirebaseMessagingPushService implements PushService {
  FirebaseMessagingPushService(this._messaging);

  factory FirebaseMessagingPushService.instance() =>
      FirebaseMessagingPushService(FirebaseMessaging.instance);

  final FirebaseMessaging _messaging;

  @override
  Future<void> init() async {
    // iOS pide permisos explícitos (alert + badge + sound). En Android 13+
    // el manifest declara POST_NOTIFICATIONS y la plataforma pide el
    // permiso automáticamente la primera vez que se muestre una.
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  @override
  Future<String?> obtainToken() async {
    try {
      return await _messaging.getToken();
    } catch (error, stack) {
      // Sin proyecto real configurado FCM tira excepción; la app debe
      // seguir operativa aunque no haya push.
      if (kDebugMode) {
        debugPrint('FCM getToken falló: $error\n$stack');
      }
      return null;
    }
  }

  @override
  Stream<String> get tokenRefreshes => _messaging.onTokenRefresh;
}

/// Stub determinístico usado en tests/dev cuando no se quiere depender de
/// la plataforma. Devuelve un token derivado del `deviceId` y un stream
/// vacío de refreshes.
class StubPushService implements PushService {
  StubPushService(this._deviceId);

  final String _deviceId;

  @override
  Future<void> init() async {}

  @override
  Future<String?> obtainToken() async {
    return 'stub-push-token:$_deviceId';
  }

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();
}
