import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';
import '../../../state/session_controller.dart';
import '../../widgets/buttons.dart';

/// Pantalla de activación exitosa: "Hola, {nombre}". Tono operativo, sin
/// celebración. Confirma que el teléfono quedó vinculado y la app, operativa.
class ActivationSuccessScreen extends ConsumerWidget {
  const ActivationSuccessScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = ref.watch(
      sessionControllerProvider.select((s) => s.provider),
    );
    final nombre = provider?.nombre ?? '';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Insets.screenPadX),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(
                  color: AppColors.teal100,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 48,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: Insets.x6),
              Text(
                nombre.isEmpty ? 'Hola' : 'Hola, $nombre',
                textAlign: TextAlign.center,
                style: AppText.displayMd,
              ),
              const SizedBox(height: Insets.x3),
              Text(
                'Tu teléfono quedó activado. Ya podés ver tus servicios '
                'asignados.',
                textAlign: TextAlign.center,
                style: AppText.body.copyWith(color: AppColors.textMuted),
              ),
              const Spacer(),
              PrimaryButton(
                label: 'Continuar',
                onPressed: () {
                  ref
                      .read(sessionControllerProvider.notifier)
                      .markActivationSeen();
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
