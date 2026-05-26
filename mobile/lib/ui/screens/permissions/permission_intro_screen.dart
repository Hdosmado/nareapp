import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../services/location_service.dart';
import '../../../state/providers.dart';
import '../../widgets/banner.dart';
import '../../widgets/buttons.dart';
import '../../widgets/top_bar.dart';

/// Explicación previa del uso de ubicación, antes de pedir el permiso del
/// sistema. Es divulgación explícita: el prestador entiende qué se comparte,
/// cuándo y cómo se detiene, antes de conceder nada.
class PermissionIntroScreen extends ConsumerStatefulWidget {
  const PermissionIntroScreen({super.key});

  @override
  ConsumerState<PermissionIntroScreen> createState() =>
      _PermissionIntroScreenState();
}

class _PermissionIntroScreenState
    extends ConsumerState<PermissionIntroScreen> {
  bool _requesting = false;
  LocationPermissionResult? _result;

  Future<void> _request() async {
    setState(() => _requesting = true);
    final result =
        await ref.read(locationServiceProvider).ensurePermission();
    if (!mounted) return;
    setState(() {
      _result = result;
      _requesting = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: NareTopBar(
        title: 'Ubicación y permisos',
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: AppColors.ink800,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(Insets.screenPadX),
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: AppColors.teal100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.my_location,
                      color: AppColors.primary,
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: Insets.x5),
                  Text('Compartir tu ubicación', style: AppText.h1),
                  const SizedBox(height: Insets.x3),
                  Text(
                    'Antes de cada servicio, NareApp comparte tu ubicación '
                    'con coordinación para anticipar demoras. Queremos que '
                    'sepas exactamente cómo funciona.',
                    style: AppText.body.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: Insets.x5),
                  const _Point(
                    icon: Icons.schedule_outlined,
                    title: 'Solo antes del servicio',
                    body: 'El GPS se activa en la ventana previa al inicio '
                        'y se detiene cuando confirmás LLEGUÉ.',
                  ),
                  const _Point(
                    icon: Icons.notifications_none,
                    title: 'Siempre con aviso visible',
                    body: 'Mientras se comparte la ubicación, vas a ver una '
                        'notificación. Nunca ocurre en silencio.',
                  ),
                  const _Point(
                    icon: Icons.block_outlined,
                    title: 'Nunca seguimiento permanente',
                    body: 'Fuera de la ventana previa al servicio, la app no '
                        'usa tu ubicación.',
                  ),
                  if (_result != null) ...[
                    const SizedBox(height: Insets.x4),
                    _resultBanner(_result!),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.screenPadX,
                Insets.x2,
                Insets.screenPadX,
                Insets.x4,
              ),
              child: _result == LocationPermissionResult.granted
                  ? PrimaryButton(
                      label: 'Listo',
                      onPressed: () => Navigator.of(context).pop(),
                    )
                  : _result == LocationPermissionResult.deniedForever
                      ? PrimaryButton(
                          label: 'Abrir ajustes',
                          onPressed: () => ref
                              .read(locationServiceProvider)
                              .openSettings(),
                        )
                      : PrimaryButton(
                          label: 'Activar ubicación',
                          loading: _requesting,
                          onPressed: _request,
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultBanner(LocationPermissionResult result) {
    switch (result) {
      case LocationPermissionResult.granted:
        return const NareBanner(
          tone: BannerTone.success,
          title: 'Ubicación activada',
          body: 'Ya podés compartir tu ubicación antes de cada servicio.',
        );
      case LocationPermissionResult.deniedForever:
        return const NareBanner(
          tone: BannerTone.warning,
          title: 'Permiso bloqueado',
          body: 'Habilitá la ubicación desde los ajustes del teléfono.',
        );
      case LocationPermissionResult.serviceDisabled:
        return const NareBanner(
          tone: BannerTone.warning,
          title: 'GPS apagado',
          body: 'Encendé la ubicación del teléfono e intentá de nuevo.',
        );
      case LocationPermissionResult.denied:
        return const NareBanner(
          tone: BannerTone.warning,
          title: 'Permiso pendiente',
          body: 'Sin el permiso no vas a poder confirmar llegadas con GPS.',
        );
    }
  }
}

class _Point extends StatelessWidget {
  const _Point({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Insets.x4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: AppColors.primary),
          const SizedBox(width: Insets.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppText.h3),
                const SizedBox(height: 2),
                Text(
                  body,
                  style: AppText.meta,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
