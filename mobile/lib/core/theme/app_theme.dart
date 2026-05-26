import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'colors.dart';
import 'spacing.dart';
import 'typography.dart';

/// Construye el [ThemeData] de NareApp a partir de los tokens del design
/// system. La app es clara (no hay modo oscuro): el fondo es arena cálida,
/// más legible bajo sol intenso que el blanco puro.
class AppTheme {
  AppTheme._();

  static ThemeData build() {
    final base = ThemeData(brightness: Brightness.light, useMaterial3: true);

    return base.copyWith(
      scaffoldBackgroundColor: AppColors.bg,
      canvasColor: AppColors.bg,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: AppColors.sand0,
        secondary: AppColors.teal600,
        onSecondary: AppColors.sand0,
        error: AppColors.critical,
        onError: AppColors.sand0,
        surface: AppColors.surface,
        onSurface: AppColors.text,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
        bodyColor: AppColors.text,
        displayColor: AppColors.text,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        thickness: 1,
        space: 1,
      ),
      splashFactory: InkRipple.splashFactory,
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.ink900,
        contentTextStyle: AppText.body.copyWith(color: AppColors.sand0),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
      ),
    );
  }
}
