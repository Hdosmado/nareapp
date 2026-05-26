import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';
import 'pressable.dart';

/// Botón de acción de pantalla completa con alto fijo de 64px, según el
/// design system. Lo usan tanto la acción crítica (LLEGUÉ) como la primaria
/// (FIN DE SERVICIO). El color define la jerarquía.
class _BigButton extends StatelessWidget {
  const _BigButton({
    required this.label,
    required this.background,
    required this.onPressed,
    this.icon,
    this.loading = false,
  });

  final String label;
  final Color background;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return PressableScale(
      enabled: enabled,
      onTap: onPressed,
      child: Container(
        height: Dimens.criticalButtonHeight,
        width: double.infinity,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(Radii.lg),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14141414),
              blurRadius: 14,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.6,
                    valueColor: AlwaysStoppedAnimation(AppColors.sand0),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, color: AppColors.sand0, size: 24),
                      const SizedBox(width: Insets.x3),
                    ],
                    Text(label, style: AppText.buttonCritical),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Botón de acción crítica (LLEGUÉ). Coral — único uso del color crítico.
class CriticalButton extends StatelessWidget {
  const CriticalButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return _BigButton(
      label: label,
      background: AppColors.critical,
      onPressed: onPressed,
      icon: icon,
      loading: loading,
    );
  }
}

/// Botón de acción primaria (FIN DE SERVICIO, ABRIR GOOGLE MAPS). Teal-700.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return _BigButton(
      label: label,
      background: AppColors.primary,
      onPressed: onPressed,
      icon: icon,
      loading: loading,
    );
  }
}

/// Botón secundario: contorno teal, alto 48px. Sentence case.
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.fullWidth = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      enabled: onPressed != null,
      onTap: onPressed,
      child: Container(
        height: Dimens.minHitTarget,
        width: fullWidth ? double.infinity : null,
        padding: const EdgeInsets.symmetric(horizontal: Insets.x4),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(Radii.md),
          border: Border.all(color: AppColors.primary, width: 1.5),
        ),
        child: Row(
          mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, color: AppColors.primary, size: 20),
              const SizedBox(width: Insets.x2),
            ],
            Text(
              label,
              style: AppText.button.copyWith(color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}

/// Botón fantasma: sin fondo ni borde, solo texto teal. Para acciones de baja
/// jerarquía (volver, omitir).
class GhostButton extends StatelessWidget {
  const GhostButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      enabled: onPressed != null,
      onTap: onPressed,
      child: Container(
        height: Dimens.minHitTarget,
        padding: const EdgeInsets.symmetric(horizontal: Insets.x3),
        alignment: Alignment.center,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, color: AppColors.primary, size: 20),
              const SizedBox(width: Insets.x2),
            ],
            Text(
              label,
              style: AppText.button.copyWith(color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}
