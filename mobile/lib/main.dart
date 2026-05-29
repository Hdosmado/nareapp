import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'firebase_options.dart';
import 'services/push_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // La app del prestador se usa siempre en vertical.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  // Firebase: la inicialización falla silenciosamente si las credenciales
  // siguen siendo el stub — la app sigue operativa sin push.
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    // Background/terminated: Android muestra el banner por sí solo desde
    // el campo `notification:` del payload FCM, usando el canal abajo. No
    // registramos `onBackgroundMessage` porque generaría una notif local
    // duplicada encima del banner del sistema.

    // Crea el canal de Android desde el arranque, así Android tiene un
    // canal HIGH para mostrar el banner aunque la app esté terminada cuando
    // llega la push (el system tray necesita el canal antes de display).
    final plugin = FlutterLocalNotificationsPlugin();
    await plugin.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    await plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            kPushChannelId,
            kPushChannelName,
            description: kPushChannelDesc,
            importance: Importance.high,
          ),
        );
  } catch (error, stack) {
    if (kDebugMode) {
      debugPrint('Firebase.initializeApp falló: $error\n$stack');
    }
  }
  runApp(const ProviderScope(child: NareApp()));
}
