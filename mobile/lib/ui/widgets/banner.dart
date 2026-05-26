import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';

/// Tono de un mensaje en línea.
enum BannerTone { info, warning, danger, success }

/// Mensaje informativo en línea. Tono operativo, anti-pánico: explica qué
/// pasa y, cuando corresponde, que el dato se va a guardar.
class NareBanner extends StatelessWidget {
  const NareBanner({
    super.key,
    required this.tone,
    required this.title,
    this.body,
    this.icon,
  });

  final BannerTone tone;
  final String title;
  final String? body;
  final IconData? icon;

  ({Color bg, Color fg}) get _palette {
    switch (tone) {
      case BannerTone.info:
        return (bg: StateTokens.sync.bg, fg: StateTokens.sync.fg);
      case BannerTone.warning:
        return (bg: StateTokens.enRiesgo.bg, fg: StateTokens.enRiesgo.fg);
      case BannerTone.danger:
        return (bg: StateTokens.ausente.bg, fg: StateTokens.ausente.fg);
      case BannerTone.success:
        return (bg: StateTokens.enServicio.bg, fg: StateTokens.enServicio.fg);
    }
  }

  IconData get _icon {
    if (icon != null) return icon!;
    switch (tone) {
      case BannerTone.info:
        return Icons.info_outline;
      case BannerTone.warning:
        return Icons.warning_amber_outlined;
      case BannerTone.danger:
        return Icons.error_outline;
      case BannerTone.success:
        return Icons.check_circle_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = _palette;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Insets.x4,
        vertical: Insets.x3 + 2,
      ),
      decoration: BoxDecoration(
        color: palette.bg,
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_icon, color: palette.fg, size: 20),
          const SizedBox(width: Insets.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppText.h3.copyWith(color: palette.fg, fontSize: 15),
                ),
                if (body != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    body!,
                    style: AppText.meta.copyWith(color: palette.fg),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
