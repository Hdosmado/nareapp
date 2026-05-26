import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/colors.dart';

/// Logotipo de NareApp: el wordmark "nare" en Bricolage Grotesque con un punto
/// sobre la "n" que evoca un pin de ubicación.
class NareWordmark extends StatelessWidget {
  const NareWordmark({
    super.key,
    this.fontSize = 32,
    this.color = AppColors.primary,
  });

  final double fontSize;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Padding(
          padding: EdgeInsets.only(top: fontSize * 0.16),
          child: Text(
            'nare',
            style: GoogleFonts.bricolageGrotesque(
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              color: color,
              letterSpacing: -fontSize * 0.03,
            ),
          ),
        ),
        Positioned(
          left: fontSize * 0.12,
          top: 0,
          child: Container(
            width: fontSize * 0.2,
            height: fontSize * 0.2,
            decoration: const BoxDecoration(
              color: AppColors.coral600,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ],
    );
  }
}
