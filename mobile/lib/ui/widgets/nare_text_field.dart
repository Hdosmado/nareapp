import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';

/// Campo de texto del design system: etiqueta arriba, contorno suave, foco
/// con anillo teal, mensaje de ayuda o error abajo.
class NareTextField extends StatelessWidget {
  const NareTextField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.help,
    this.error,
    this.obscure = false,
    this.keyboardType,
    this.textInputAction,
    this.onSubmitted,
    this.onChanged,
    this.autofocus = false,
    this.enabled = true,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final String? help;
  final String? error;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final bool autofocus;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final hasError = error != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppText.meta.copyWith(
            color: AppColors.ink800,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: Insets.x1 + 2),
        TextField(
          controller: controller,
          obscureText: obscure,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          onSubmitted: onSubmitted,
          onChanged: onChanged,
          autofocus: autofocus,
          enabled: enabled,
          style: AppText.body,
          cursorColor: AppColors.primary,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppText.body.copyWith(color: AppColors.textFaint),
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: Insets.x4,
              vertical: Insets.x3 + 2,
            ),
            enabledBorder: _border(
              hasError ? AppColors.critical : AppColors.border,
            ),
            focusedBorder: _border(
              hasError ? AppColors.critical : AppColors.focusRing,
              width: 1.5,
            ),
            disabledBorder: _border(AppColors.border),
            errorBorder: _border(AppColors.critical),
            focusedErrorBorder: _border(AppColors.critical, width: 1.5),
          ),
        ),
        if (help != null || error != null) ...[
          const SizedBox(height: Insets.x1 + 2),
          Text(
            error ?? help!,
            style: AppText.label.copyWith(
              letterSpacing: 0,
              color: hasError ? AppColors.criticalHover : AppColors.textMuted,
            ),
          ),
        ],
      ],
    );
  }

  OutlineInputBorder _border(Color color, {double width = 1.5}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(Radii.md),
      borderSide: BorderSide(color: color, width: width),
    );
  }
}
