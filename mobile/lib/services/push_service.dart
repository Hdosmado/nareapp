import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Canal Android de alta importancia que usamos para todas las pushes
/// operativas. Lo creamos del lado app y el backend manda `channelId` con
/// este id (`android.notification.channelId`) para que Android use este
/// canal y muestre banner heads-up.
const String kPushChannelId = 'nareapp_pushes';
const String kPushChannelName = 'Avisos operativos';
const String kPushChannelDesc =
    'Avisos de coordinación, recordatorios y alertas de servicio.';

/// Servicio de notificaciones push.
///
/// La implementación de producción usa Firebase Cloud Messaging: pide
/// permisos a la plataforma, obtiene el token del dispositivo, registra el
/// canal Android de alta importancia y muestra una notificación local
/// cuando llega un mensaje con la app en foreground.
abstract class PushService {
  /// Inicializa el servicio (permisos, canales, handlers en foreground).
  Future<void> init();

  /// Token del dispositivo para push, o `null` si no se pudo obtener.
  Future<String?> obtainToken();

  /// Stream de tokens nuevos cuando FCM los rota.
  Stream<String> get tokenRefreshes;

  /// Muestra una notificación local en el dispositivo (banner + sonido), sin
  /// depender de FCM. Se usa para avisos generados localmente por la app, p.
  /// ej. cuando detecta una persona a cuidar recién asignada. Best-effort: si
  /// el permiso de notificaciones está denegado, no hace nada.
  Future<void> showLocalAlert(String title, String body);
}

/// Implementación real basada en `firebase_messaging` + `flutter_local_notifications`.
///
/// Si el proyecto de Firebase aún es el stub (sin `google-services.json`
/// real), `getToken()` devolverá `null` silenciosamente — la app sigue
/// operativa sin push.
class FirebaseMessagingPushService implements PushService {
  FirebaseMessagingPushService(this._messaging, this._localNotifications);

  factory FirebaseMessagingPushService.instance() =>
      FirebaseMessagingPushService(
        FirebaseMessaging.instance,
        FlutterLocalNotificationsPlugin(),
      );

  final FirebaseMessaging _messaging;
  final FlutterLocalNotificationsPlugin _localNotifications;
  bool _initialized = false;
  bool _localReady = false;

  @override
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    // iOS pide permisos explícitos (alert + badge + sound). En Android 13+
    // firebase_messaging dispara el prompt nativo de POST_NOTIFICATIONS.
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // En iOS, firebase_messaging se adueña del delegate de notificaciones y,
    // por defecto, NO presenta banners cuando la app está en primer plano.
    // Esto le indica explícitamente que igual muestre alert + badge + sonido
    // en foreground (para FCM y para cualquier notificación que reciba).
    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    await _ensureLocalInit();

    // Mensajes recibidos con la app en foreground: FCM los entrega solo al
    // handler (no muestra banner). Mostramos notificación local en el mismo
    // canal para que aparezca como banner.
    FirebaseMessaging.onMessage.listen(_showLocalNotification);
  }

  /// Inicializa el plugin de notificaciones locales (canal Android + permiso
  /// iOS). Es idempotente e independiente de FCM, para poder mostrar avisos
  /// locales aunque el push remoto esté deshabilitado.
  Future<void> _ensureLocalInit() async {
    if (_localReady) return;
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    await _localNotifications.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    // Canal Android de alta importancia. El backend referencia su `id`
    // para que las pushes muestren banner heads-up.
    const channel = AndroidNotificationChannel(
      kPushChannelId,
      kPushChannelName,
      description: kPushChannelDesc,
      importance: Importance.high,
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
    _localReady = true;
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    if (kDebugMode) {
      debugPrint(
        '[push] onMessage type=${message.data['type']} '
        'title=${message.notification?.title} body=${message.notification?.body}',
      );
    }
    final notification = message.notification;
    final title = notification?.title ??
        (message.data['title'] as String?) ??
        'NareApp';
    final body = notification?.body ?? (message.data['body'] as String?) ?? '';
    if (body.isEmpty && notification == null) return;
    await showLocalAlert(title, body);
  }

  @override
  Future<void> showLocalAlert(String title, String body) async {
    try {
      await _ensureLocalInit();
      await _localNotifications.show(
        DateTime.now().millisecondsSinceEpoch.remainder(1 << 31),
        title,
        body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            kPushChannelId,
            kPushChannelName,
            channelDescription: kPushChannelDesc,
            importance: Importance.high,
            priority: Priority.high,
          ),
          // En iOS, presentar el banner aunque la app esté en foreground.
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
      );
      if (kDebugMode) {
        debugPrint('[push] notif local mostrada');
      }
    } catch (error, stack) {
      if (kDebugMode) {
        debugPrint('[push] notif local FALLÓ: $error\n$stack');
      }
    }
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

  @override
  Future<void> showLocalAlert(String title, String body) async {}
}
