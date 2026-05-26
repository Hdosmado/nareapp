/// Sistema de espaciado 4pt del design system. Usar estos tokens en lugar de
/// números sueltos mantiene el ritmo vertical consistente.
class Insets {
  Insets._();

  static const double x1 = 4;
  static const double x2 = 8;
  static const double x3 = 12;
  static const double x4 = 16;
  static const double x5 = 24;
  static const double x6 = 32;
  static const double x7 = 48;
  static const double x8 = 64;
  static const double x9 = 96;

  /// Padding horizontal de pantalla en mobile.
  static const double screenPadX = 20;
}

/// Radios de esquina del design system.
class Radii {
  Radii._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 14;
  static const double lg = 20;
  static const double xl = 28;
  static const double pill = 999;
}

/// Medidas fijas de layout.
class Dimens {
  Dimens._();

  static const double topBarHeight = 56;
  static const double tabBarHeight = 72;

  /// Alto fijo de los botones críticos (LLEGUÉ / FIN DE SERVICIO).
  static const double criticalButtonHeight = 64;

  /// Hit target mínimo accesible.
  static const double minHitTarget = 48;
}
