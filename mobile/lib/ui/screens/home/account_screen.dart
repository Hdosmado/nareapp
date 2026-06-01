import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/formatting.dart';
import '../../../state/session_controller.dart';
import '../../../state/sync_controller.dart';
import '../../widgets/buttons.dart';
import '../../widgets/pressable.dart';
import '../../widgets/top_bar.dart';
import '../permissions/permission_intro_screen.dart';
import '../privacy/privacy_screen.dart';
import '../service/location_debug_screen.dart';
import '../sync/sync_status_screen.dart';

/// Pantalla de cuenta: perfil del prestador, dispositivo, sincronización,
/// privacidad y desvinculación del teléfono.
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionControllerProvider);
    final sync = ref.watch(syncControllerProvider);
    final provider = session.provider;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const NareTopBar(title: 'Cuenta'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          Insets.screenPadX,
          Insets.x4,
          Insets.screenPadX,
          Insets.x6,
        ),
        children: [
          _Card(
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: const BoxDecoration(
                      color: AppColors.teal100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person_outline,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: Insets.x4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          provider?.nombreCompleto ?? 'Prestador',
                          style: AppText.h2,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          provider?.tipoLegible ?? '',
                          style: AppText.meta,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: Insets.x4),
          _SectionLabel('Dispositivo'),
          _Card(
            children: [
              _InfoRow(
                label: 'Identificador del dispositivo',
                value: session.deviceId ?? '—',
                mono: true,
              ),
              const Divider(height: Insets.x5),
              _InfoRow(
                label: 'Estado',
                value: 'Vinculado y activo',
              ),
            ],
          ),
          const SizedBox(height: Insets.x4),
          _SectionLabel('Sincronización'),
          _Card(
            children: [
              _InfoRow(
                label: 'Conexión',
                value: sync.isOnline ? 'Con conexión' : 'Sin conexión',
              ),
              const Divider(height: Insets.x5),
              _InfoRow(
                label: 'Registros pendientes',
                value: '${sync.pendingCount}',
              ),
              const Divider(height: Insets.x5),
              _InfoRow(
                label: 'Última sincronización',
                value: sync.lastSyncAt == null
                    ? 'Sin datos'
                    : '${Fmt.shortDate(sync.lastSyncAt!)} '
                        '${Fmt.time(sync.lastSyncAt!)}',
              ),
              const SizedBox(height: Insets.x4),
              SecondaryButton(
                label: 'Ver estado de sincronización',
                icon: Icons.cloud_sync_outlined,
                fullWidth: true,
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const SyncStatusScreen(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: Insets.x4),
          _SectionLabel('Ajustes'),
          _Card(
            padded: false,
            children: [
              _NavRow(
                icon: Icons.my_location_outlined,
                label: 'Ubicación y permisos',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const PermissionIntroScreen(),
                  ),
                ),
              ),
              const Divider(height: 1),
              _NavRow(
                icon: Icons.shield_outlined,
                label: 'Privacidad',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PrivacyScreen()),
                ),
              ),
              const Divider(height: 1),
              _NavRow(
                icon: Icons.travel_explore_outlined,
                label: 'Diagnóstico de ubicación',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const LocationDebugScreen(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: Insets.x6),
          PressableScale(
            onTap: () => _confirmUnlink(context, ref),
            child: Container(
              height: Insets.x8,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.coral50,
                borderRadius: BorderRadius.circular(Radii.md),
                border: Border.all(color: AppColors.coral100),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.link_off,
                    color: AppColors.criticalHover,
                    size: 20,
                  ),
                  const SizedBox(width: Insets.x2),
                  Text(
                    'Desvincular este teléfono',
                    style: AppText.button.copyWith(
                      color: AppColors.criticalHover,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: Insets.x3),
          Text(
            'Al desvincular, este teléfono deja de estar activado. Para '
            'volver a operar vas a necesitar un código nuevo de coordinación.',
            style: AppText.label.copyWith(letterSpacing: 0),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmUnlink(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.lg),
        ),
        title: Text('Desvincular el teléfono', style: AppText.h2),
        content: Text(
          'Vas a cerrar la sesión en este teléfono. Necesitarás un código '
          'nuevo para volver a activarlo. ¿Querés continuar?',
          style: AppText.body,
        ),
        actions: [
          GhostButton(
            label: 'Cancelar',
            onPressed: () => Navigator.of(context).pop(false),
          ),
          GhostButton(
            label: 'Desvincular',
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(sessionControllerProvider.notifier).unlink();
    }
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Insets.x2, left: Insets.x1),
      child: Text(text.toUpperCase(), style: AppText.label),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.children, this.padded = true});
  final List<Widget> children;
  final bool padded;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padded ? const EdgeInsets.all(Insets.x4 + 2) : EdgeInsets.zero,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.mono = false});
  final String label;
  final String value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppText.label.copyWith(letterSpacing: 0)),
        const SizedBox(height: 3),
        Text(
          value,
          style: mono ? AppText.mono.copyWith(color: AppColors.text) : AppText.bodyStrong,
        ),
      ],
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      child: Container(
        height: Insets.x8,
        padding: const EdgeInsets.symmetric(horizontal: Insets.x4 + 2),
        color: AppColors.surface,
        child: Row(
          children: [
            Icon(icon, size: 22, color: AppColors.ink600),
            const SizedBox(width: Insets.x3),
            Expanded(child: Text(label, style: AppText.bodyStrong)),
            const Icon(
              Icons.chevron_right,
              color: AppColors.ink400,
            ),
          ],
        ),
      ),
    );
  }
}
