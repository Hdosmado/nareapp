import 'package:flutter/material.dart';

import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';

/// Encabezado de sección: etiqueta en mayúsculas, con una acción opcional.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.label, this.action});

  final String label;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Insets.x1),
      child: Row(
        children: [
          Expanded(
            child: Text(label.toUpperCase(), style: AppText.label),
          ),
          ?action,
        ],
      ),
    );
  }
}
