import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/typography.dart';
import 'pressable.dart';

/// Ítem de la barra de pestañas inferior.
class NareTab {
  const NareTab({required this.label, required this.icon});
  final String label;
  final IconData icon;
}

/// Barra de pestañas inferior. Tres ítems como máximo: Hoy · Servicios ·
/// Cuenta. Respeta el área segura del teléfono.
class NareTabBar extends StatelessWidget {
  const NareTabBar({
    super.key,
    required this.tabs,
    required this.currentIndex,
    required this.onChanged,
  });

  final List<NareTab> tabs;
  final int currentIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              for (var i = 0; i < tabs.length; i++)
                Expanded(child: _item(i)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(int index) {
    final tab = tabs[index];
    final active = index == currentIndex;
    final color = active ? AppColors.primary : AppColors.ink500;
    return PressableScale(
      onTap: () => onChanged(index),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(tab.icon, color: color, size: 22),
          const SizedBox(height: 4),
          Text(
            tab.label,
            style: AppText.label.copyWith(
              color: color,
              letterSpacing: 0,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
