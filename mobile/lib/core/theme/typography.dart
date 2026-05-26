import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'colors.dart';

/// Tipografía del design system. Tres familias:
/// - Bricolage Grotesque para display y números operativos.
/// - Plus Jakarta Sans para UI y cuerpo (alta legibilidad en Android gama baja).
/// - JetBrains Mono para datos técnicos (deviceId, claves de idempotencia).
///
/// Tamaño mínimo 14px, cuerpo base 16px: la app se usa al sol y por personas
/// mayores. Las clases reproducen las clases `.t-*` del CSS del design system.
class AppText {
  AppText._();

  static TextStyle _display(double size, {FontWeight weight = FontWeight.w600}) {
    return GoogleFonts.bricolageGrotesque(
      fontSize: size,
      fontWeight: weight,
      height: 1.15,
      letterSpacing: -0.02 * size,
      color: AppColors.text,
    );
  }

  static TextStyle _body(
    double size, {
    FontWeight weight = FontWeight.w400,
    Color color = AppColors.text,
    double height = 1.5,
  }) {
    return GoogleFonts.plusJakartaSans(
      fontSize: size,
      fontWeight: weight,
      height: height,
      color: color,
    );
  }

  static TextStyle get displayXl => _display(48);
  static TextStyle get displayLg => _display(32);
  static TextStyle get displayMd => _display(24).copyWith(height: 1.3);

  static TextStyle get h1 => _display(28);
  static TextStyle get h2 =>
      _body(20, weight: FontWeight.w700, height: 1.3).copyWith(letterSpacing: -0.2);
  static TextStyle get h3 => _body(16, weight: FontWeight.w700, height: 1.3);

  static TextStyle get body => _body(16);
  static TextStyle get bodyStrong => _body(16, weight: FontWeight.w600);
  static TextStyle get meta =>
      _body(14, weight: FontWeight.w500, color: AppColors.textMuted, height: 1.3);
  static TextStyle get label => _body(
        12,
        weight: FontWeight.w600,
        color: AppColors.textMuted,
        height: 1.3,
      ).copyWith(letterSpacing: 0.48);

  /// Texto de botones de acción crítica: mayúsculas, espaciado generoso.
  static TextStyle get buttonCritical => _body(
        20,
        weight: FontWeight.w700,
        color: AppColors.sand0,
        height: 1,
      ).copyWith(letterSpacing: 1.2);

  static TextStyle get button =>
      _body(16, weight: FontWeight.w600, height: 1);

  /// Números operativos (hora de inicio, código de activación).
  static TextStyle numeric(double size, {Color color = AppColors.text}) {
    return GoogleFonts.bricolageGrotesque(
      fontSize: size,
      fontWeight: FontWeight.w500,
      color: color,
      letterSpacing: -0.02 * size,
    );
  }

  /// Datos técnicos monoespaciados.
  static TextStyle get mono => GoogleFonts.jetBrainsMono(
        fontSize: 12,
        color: AppColors.textMuted,
      );
}
