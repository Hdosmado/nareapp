import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/session_controller.dart';
import '../../widgets/nare_tab_bar.dart';
import '../activation/activation_success_screen.dart';
import 'account_screen.dart';
import 'services_screen.dart';
import 'today_screen.dart';

/// Contenedor de la app operativa: aloja las tres pestañas
/// (Hoy · Servicios · Cuenta) y, tras una activación, muestra una vez la
/// pantalla de activación exitosa.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _tabs = [
    NareTab(label: 'Hoy', icon: Icons.home_outlined),
    NareTab(label: 'Servicios', icon: Icons.calendar_today_outlined),
    NareTab(label: 'Cuenta', icon: Icons.person_outline),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (ref.read(sessionControllerProvider).justActivated) {
        Navigator.of(context).push(
          MaterialPageRoute(
            fullscreenDialog: true,
            builder: (_) => const ActivationSuccessScreen(),
          ),
        );
      }
    });
  }

  void _goToTab(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          TodayScreen(onSeeAllServices: () => _goToTab(1)),
          const ServicesScreen(),
          const AccountScreen(),
        ],
      ),
      bottomNavigationBar: NareTabBar(
        tabs: _tabs,
        currentIndex: _index,
        onChanged: _goToTab,
      ),
    );
  }
}
