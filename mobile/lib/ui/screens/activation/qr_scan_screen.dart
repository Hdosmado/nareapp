import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';

/// Escaneo del QR de activación (mecanismo secundario, para el caso
/// presencial).
///
/// Nota: el escáner de cámara (`mobile_scanner`/GoogleMLKit) no es compatible
/// con el simulador de iOS en Apple Silicon (solo arm64). Para poder correr la
/// app en el simulador, esta pantalla queda como placeholder y deriva al
/// mecanismo principal: el código numérico de 8 dígitos. En un dispositivo
/// real se puede reactivar el escáner restaurando el plugin `mobile_scanner`.
class QrScanScreen extends StatelessWidget {
  const QrScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ink900,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(Insets.x2),
              child: Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  color: AppColors.sand0,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Insets.screenPadX,
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.qr_code_scanner,
                    size: 72,
                    color: AppColors.sand0,
                  ),
                  const SizedBox(height: Insets.x4),
                  Text(
                    'El escaneo de QR no está disponible en el simulador.\n'
                    'Ingresá el código de activación de 8 dígitos que te '
                    'muestra coordinación.',
                    textAlign: TextAlign.center,
                    style: AppText.body.copyWith(color: AppColors.sand0),
                  ),
                ],
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.screenPadX,
                Insets.x4,
                Insets.screenPadX,
                Insets.x8,
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Volver e ingresar el código'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
