import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';

/// Mapa de reemplazo. El MVP no integra el SDK de Google Maps ni una API key:
/// se dibuja una superficie funcional que ubica el domicilio, y la navegación
/// real se delega a Google Maps por deep link.
class FauxMap extends StatelessWidget {
  const FauxMap({super.key, this.height = 240, this.borderRadius = Radii.md});

  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: CustomPaint(
          painter: _MapPainter(),
          child: const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.location_on, color: AppColors.coral600, size: 44),
                SizedBox(height: Insets.x1),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()..color = const Color(0xFFE8EBE3);
    canvas.drawRect(Offset.zero & size, bg);

    // Grilla suave que evoca las cuadras de un mapa.
    final grid = Paint()
      ..color = const Color(0x0A141414)
      ..strokeWidth = 1;
    const step = 38.0;
    for (var x = 0.0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (var y = 0.0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    // Avenidas en blanco quebrado.
    final road = Paint()
      ..color = AppColors.sand0
      ..strokeWidth = 16
      ..style = PaintingStyle.stroke;
    final horizontal = Path()
      ..moveTo(-20, size.height * 0.34)
      ..quadraticBezierTo(
        size.width * 0.4,
        size.height * 0.24,
        size.width + 20,
        size.height * 0.4,
      );
    canvas.drawPath(horizontal, road);
    final vertical = Path()
      ..moveTo(size.width * 0.46, -20)
      ..lineTo(size.width * 0.58, size.height + 20);
    canvas.drawPath(vertical, road);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
