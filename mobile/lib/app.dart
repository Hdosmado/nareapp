import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'state/session_controller.dart';
import 'ui/screens/activation/activate_phone_screen.dart';
import 'ui/screens/home/home_shell.dart';
import 'ui/screens/splash_screen.dart';

/// Raíz de NareApp. Define el tema y enruta según la sesión:
/// arranque → activación → app operativa.
class NareApp extends StatelessWidget {
  const NareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NareApp',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(),
      home: const _Root(),
    );
  }
}

class _Root extends ConsumerWidget {
  const _Root();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status =
        ref.watch(sessionControllerProvider.select((s) => s.status));

    final Widget screen;
    switch (status) {
      case SessionStatus.booting:
        screen = const SplashScreen();
      case SessionStatus.unauthenticated:
        screen = const ActivatePhoneScreen();
      case SessionStatus.authenticated:
        screen = const HomeShell();
    }

    // Transición sobria: fundido de 180ms, sin desplazamientos llamativos.
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      switchInCurve: const Cubic(0.2, 0.7, 0.2, 1),
      child: KeyedSubtree(
        key: ValueKey(status),
        child: screen,
      ),
    );
  }
}
