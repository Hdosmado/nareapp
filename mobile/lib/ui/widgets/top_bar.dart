import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';

/// Barra superior del design system: título a la izquierda, una sola acción
/// opcional a la derecha. Alto fijo 56px.
class NareTopBar extends StatelessWidget implements PreferredSizeWidget {
  const NareTopBar({super.key, required this.title, this.leading, this.action});

  final String title;
  final Widget? leading;
  final Widget? action;

  @override
  Size get preferredSize => const Size.fromHeight(Dimens.topBarHeight);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: Dimens.topBarHeight,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: Insets.x2),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            height: 44,
            child: leading == null ? null : Center(child: leading),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Insets.x1),
              child: Text(
                title,
                style: AppText.h3.copyWith(fontSize: 17),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          SizedBox(
            width: 44,
            height: 44,
            child: action == null ? null : Center(child: action),
          ),
        ],
      ),
    );
  }
}
