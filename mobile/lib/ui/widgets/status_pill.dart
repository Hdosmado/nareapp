import 'package:flutter/material.dart';

import '../../core/constants/service_status.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';

/// Etiqueta de estado del servicio: token en minúscula con un punto de color.
/// El punto y la etiqueta acompañan al color para que el estado se distinga
/// también en daltonismo.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.status, this.small = false});

  final ServiceStatus status;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final colors = status.colors;
    final dot = small ? 6.0 : 7.0;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 9 : 12,
        vertical: small ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: colors.bg,
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: dot,
            height: dot,
            decoration: BoxDecoration(
              color: colors.dot,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: Insets.x1 + 2),
          Text(
            status.label,
            style: AppText.label.copyWith(
              color: colors.fg,
              fontSize: small ? 11 : 12,
              letterSpacing: 0,
            ),
          ),
        ],
      ),
    );
  }
}
