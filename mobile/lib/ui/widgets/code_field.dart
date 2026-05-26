import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import '../../core/theme/typography.dart';

/// Formateador del código de activación: solo dígitos, máximo 8, agrupados
/// como `4829-1573`.
class _CodeFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final trimmed = digits.length > 8 ? digits.substring(0, 8) : digits;
    final buffer = StringBuffer();
    for (var i = 0; i < trimmed.length; i++) {
      if (i == 4) buffer.write('-');
      buffer.write(trimmed[i]);
    }
    final text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

/// Campo del código de activación de 8 dígitos: teclado numérico, autoformato
/// en grupos de 4 (`4829-1573`) y dígitos grandes para tipear sin errores.
class CodeField extends StatefulWidget {
  const CodeField({
    super.key,
    required this.onChanged,
    this.onCompleted,
    this.enabled = true,
    this.autofocus = true,
  });

  /// Devuelve el código en bruto (solo dígitos, hasta 8).
  final ValueChanged<String> onChanged;

  /// Se invoca cuando se completaron los 8 dígitos.
  final ValueChanged<String>? onCompleted;

  final bool enabled;
  final bool autofocus;

  @override
  State<CodeField> createState() => _CodeFieldState();
}

class _CodeFieldState extends State<CodeField> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleChange(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    widget.onChanged(digits);
    if (digits.length == 8) {
      widget.onCompleted?.call(digits);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      autofocus: widget.autofocus,
      keyboardType: TextInputType.number,
      textAlign: TextAlign.center,
      maxLength: 9, // 8 dígitos + el guión
      inputFormatters: [_CodeFormatter()],
      onChanged: _handleChange,
      cursorColor: AppColors.primary,
      style: AppText.numeric(34).copyWith(letterSpacing: 4),
      decoration: InputDecoration(
        counterText: '',
        hintText: '0000-0000',
        hintStyle: AppText.numeric(34).copyWith(
          letterSpacing: 4,
          color: AppColors.ink300,
        ),
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(vertical: Insets.x4),
        enabledBorder: _border(AppColors.border),
        focusedBorder: _border(AppColors.focusRing, width: 2),
        disabledBorder: _border(AppColors.border),
      ),
    );
  }

  OutlineInputBorder _border(Color color, {double width = 1.5}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(Radii.md),
      borderSide: BorderSide(color: color, width: width),
    );
  }
}
