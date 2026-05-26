import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'firebase_options.dart';

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
  } catch (error, stack) {
    if (kDebugMode) {
      debugPrint('Firebase.initializeApp falló: $error\n$stack');
    }
  }
  runApp(const ProviderScope(child: NareApp()));
}
