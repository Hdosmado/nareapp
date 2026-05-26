import 'package:flutter/material.dart';

/// Paleta de NareApp, traducida 1:1 desde `colors_and_type.css` del design
/// system. Dos ejes: un teal de marca y una arena cálida de fondo. El coral se
/// reserva para la acción crítica (LLEGUÉ) y los errores graves.
class AppColors {
  AppColors._();

  // ---------- Marca ----------
  static const teal900 = Color(0xFF062F2F);
  static const teal800 = Color(0xFF084343);
  static const teal700 = Color(0xFF0E5C5C); // primario de marca
  static const teal600 = Color(0xFF157777);
  static const teal500 = Color(0xFF1F9494);
  static const teal400 = Color(0xFF5BB6B6);
  static const teal200 = Color(0xFFC0E0E0);
  static const teal100 = Color(0xFFE0EFEF);
  static const teal50 = Color(0xFFF0F7F7);

  // ---------- Acento (solo acción crítica) ----------
  static const coral700 = Color(0xFFB83E29);
  static const coral600 = Color(0xFFD9533B); // botón LLEGUÉ, errores graves
  static const coral500 = Color(0xFFE4715C);
  static const coral100 = Color(0xFFFAE0DA);
  static const coral50 = Color(0xFFFCEFEB);

  // ---------- Neutros cálidos ----------
  static const ink900 = Color(0xFF141414); // texto primario
  static const ink800 = Color(0xFF2A2724);
  static const ink700 = Color(0xFF443F39);
  static const ink600 = Color(0xFF6B645C); // texto secundario
  static const ink500 = Color(0xFF8A8278);
  static const ink400 = Color(0xFFADA59B);
  static const ink300 = Color(0xFFCFC8BE);
  static const ink200 = Color(0xFFE5DFD5); // bordes
  static const ink100 = Color(0xFFEFEAE1);
  static const ink50 = Color(0xFFF7F4EE); // fondo de página

  static const sand0 = Color(0xFFFFFFFF);
  static const sand50 = Color(0xFFF7F4EE);
  static const sand100 = Color(0xFFEFEAE1);
  static const sand200 = Color(0xFFE5DFD5);

  // ---------- Alias semánticos ----------
  static const bg = sand50;
  static const surface = sand0;
  static const surfaceAlt = sand100;
  static const border = ink200;
  static const borderStrong = ink300;
  static const text = ink900;
  static const textMuted = ink600;
  static const textFaint = ink500;
  static const primary = teal700;
  static const primaryHover = teal800;
  static const critical = coral600;
  static const criticalHover = coral700;
  static const focusRing = teal500;

  // ---------- Funcionales ----------
  static const success = Color(0xFF2F7A28);
  static const warning = Color(0xFFC98B1B);
  static const danger = Color(0xFFB83E29);
  static const info = Color(0xFF3C5BA8);
}

/// Tripleta de color de un estado del servicio: fondo, texto y punto.
class StateColors {
  const StateColors(this.bg, this.fg, this.dot);
  final Color bg;
  final Color fg;
  final Color dot;
}

/// Colores semánticos por estado, traducidos desde los tokens `--state-*`.
class StateTokens {
  StateTokens._();

  static const pendiente =
      StateColors(Color(0xFFEFEAE1), Color(0xFF443F39), Color(0xFF8A8278));
  static const proximo =
      StateColors(Color(0xFFE0EFEF), Color(0xFF084343), Color(0xFF157777));
  static const enRiesgo =
      StateColors(Color(0xFFFDEBC8), Color(0xFF6F4A0A), Color(0xFFC98B1B));
  static const llegue =
      StateColors(Color(0xFFDBEFD9), Color(0xFF1F4A1A), Color(0xFF3F8A38));
  static const enServicio =
      StateColors(Color(0xFFC9E6C5), Color(0xFF163E12), Color(0xFF2F7A28));
  static const finalizado =
      StateColors(Color(0xFFE5DFD5), Color(0xFF443F39), Color(0xFF6B645C));
  static const ausente =
      StateColors(Color(0xFFFAE0DA), Color(0xFF6E1E10), Color(0xFFB83E29));
  static const demorado =
      StateColors(Color(0xFFFDDDCB), Color(0xFF7A2E0F), Color(0xFFD9533B));
  static const sync =
      StateColors(Color(0xFFDEE6F4), Color(0xFF1B2C57), Color(0xFF3C5BA8));
}
