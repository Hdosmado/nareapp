import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/spacing.dart';
import '../../../core/theme/typography.dart';

/// Escaneo del QR de activación (mecanismo secundario, para el caso
/// presencial). Devuelve el token extraído del QR a la pantalla anterior.
class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    for (final barcode in capture.barcodes) {
      final token = _extractToken(barcode.rawValue);
      if (token != null) {
        _handled = true;
        Navigator.of(context).pop(token);
        return;
      }
    }
  }

  /// El QR trae una URL `…/activate?token=XXX`; si no, se usa el valor crudo.
  String? _extractToken(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final value = raw.trim();
    final uri = Uri.tryParse(value);
    final fromQuery = uri?.queryParameters['token'];
    if (fromQuery != null && fromQuery.isNotEmpty) return fromQuery;
    return value;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ink900,
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          // Marco guía de encuadre.
          Center(
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.sand0, width: 3),
                borderRadius: BorderRadius.circular(Radii.lg),
              ),
            ),
          ),
          SafeArea(
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
                  padding: const EdgeInsets.fromLTRB(
                    Insets.screenPadX,
                    Insets.x4,
                    Insets.screenPadX,
                    Insets.x8,
                  ),
                  child: Text(
                    'Apuntá la cámara al QR de activación que te muestra '
                    'coordinación.',
                    textAlign: TextAlign.center,
                    style: AppText.body.copyWith(color: AppColors.sand0),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
