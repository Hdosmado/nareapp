import 'package:flutter/material.dart';

import '../../core/theme/colors.dart';
import '../../core/theme/spacing.dart';
import 'wordmark.dart';

/// Marca de NareApp: el logomark (figura abrazando un corazón sostenido por
/// una mano) sobre fondo transparente, así que se asienta orgánicamente sobre
/// cualquier superficie (arena, blanco, app bar) sin recuadro. El ícono con
/// recuadro crema queda reservado al launcher de la app.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 40});

  /// Lado del cuadro de dibujo del mark, en px lógicos.
  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/brand/logo.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.medium,
      // Si por algún motivo el asset no carga, caemos a la inicial coral en
      // vez de mostrar un cuadro roto.
      errorBuilder: (_, _, _) => SizedBox(
        width: size,
        height: size,
        child: Center(
          child: Text(
            'N',
            style: TextStyle(
              color: AppColors.coral600,
              fontWeight: FontWeight.w800,
              fontSize: size * 0.6,
            ),
          ),
        ),
      ),
    );
  }
}

/// Lockup vertical de marca: el logomark sobre el wordmark. Para superficies de
/// bienvenida (splash, activación) donde la marca es la protagonista.
class BrandLockup extends StatelessWidget {
  const BrandLockup({
    super.key,
    this.markSize = 96,
    this.wordmarkSize = 38,
  });

  final double markSize;
  final double wordmarkSize;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        BrandMark(size: markSize),
        const SizedBox(height: Insets.x2),
        NareWordmark(fontSize: wordmarkSize),
      ],
    );
  }
}
