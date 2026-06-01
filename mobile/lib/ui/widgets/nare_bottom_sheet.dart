import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';

/// Abre un bottom sheet del design system: superficie blanca con esquinas
/// superiores redondeadas, manija de arrastre y un scrim oscuro detrás.
Future<T?> showNareBottomSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool dismissible = true,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    isDismissible: dismissible,
    enableDrag: dismissible,
    backgroundColor: Colors.transparent,
    // Scrim del design system: rgba(20,20,20,0.4).
    barrierColor: const Color(0x66141414),
    builder: (context) => _SheetShell(child: builder(context)),
  );
}

class _SheetShell extends StatelessWidget {
  const _SheetShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    // Alto del teclado cuando está abierto. Lo sumamos al padding inferior para
    // que el sheet suba por encima del teclado y no tape los campos de texto
    // (ej: el motivo en fin de servicio). El contenido va dentro de un scroll
    // por si teclado + contenido superan el alto disponible.
    final keyboardInset = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: AnimatedPadding(
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          padding: EdgeInsets.only(bottom: keyboardInset),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              Insets.screenPadX,
              Insets.x3,
              Insets.screenPadX,
              Insets.x6,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: Insets.x4),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
