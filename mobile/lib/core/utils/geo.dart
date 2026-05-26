import 'dart:math' as math;

/// Utilidades geográficas mínimas, sin dependencias de mapas.
class Geo {
  Geo._();

  static const double _earthRadiusM = 6371000;

  /// Distancia en metros entre dos puntos (fórmula de Haversine). Sirve para
  /// validar si la llegada cae dentro del radio permitido del domicilio.
  static double distanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    final dLat = _toRad(lat2 - lat1);
    final dLon = _toRad(lon2 - lon1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRad(lat1)) *
            math.cos(_toRad(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return _earthRadiusM * c;
  }

  static double _toRad(double deg) => deg * math.pi / 180;
}
