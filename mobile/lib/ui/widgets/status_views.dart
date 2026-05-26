import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';
import 'buttons.dart';

/// Indicador de carga centrado, sobrio (sin spinners decorativos).
class NareLoading extends StatelessWidget {
  const NareLoading({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 28,
        height: 28,
        child: CircularProgressIndicator(
          strokeWidth: 2.6,
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
        ),
      ),
    );
  }
}

/// Vista de error con reintento, para estados de carga fallidos.
class NareErrorView extends StatelessWidget {
  const NareErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Insets.x6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_outlined,
              size: 40,
              color: AppColors.ink400,
            ),
            const SizedBox(height: Insets.x4),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppText.body.copyWith(color: AppColors.textMuted),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: Insets.x5),
              SecondaryButton(
                label: 'Reintentar',
                icon: Icons.refresh,
                onPressed: onRetry,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Estado vacío neutro (sin servicios, lista sin elementos).
class NareEmptyView extends StatelessWidget {
  const NareEmptyView({
    super.key,
    required this.icon,
    required this.title,
    this.body,
  });

  final IconData icon;
  final String title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Insets.x6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: AppColors.ink400),
            const SizedBox(height: Insets.x4),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppText.h3,
            ),
            if (body != null) ...[
              const SizedBox(height: Insets.x2),
              Text(
                body!,
                textAlign: TextAlign.center,
                style: AppText.meta,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
