/// Parámetros operativos que la app obtiene de `GET /mobile/config`.
/// Definen la ventana de tracking previo al servicio y el radio de geocerca.
class MobileConfig {
  const MobileConfig({
    required this.trackingLeadMin,
    required this.trackingIntervalSec,
    required this.trackingMaxWindowMin,
    required this.geofenceRadiusM,
  });

  /// Minutos antes del inicio en que la app activa el tracking.
  final int trackingLeadMin;

  /// Frecuencia de muestreo de ubicación, en segundos.
  final int trackingIntervalSec;

  /// Ventana máxima de tracking previo al servicio, en minutos.
  final int trackingMaxWindowMin;

  /// Radio de geocerca por defecto para validar la llegada, en metros.
  final int geofenceRadiusM;

  /// Valores por defecto, alineados con `config.defaults.ts` del backend.
  static const MobileConfig fallback = MobileConfig(
    trackingLeadMin: 45,
    trackingIntervalSec: 600,
    trackingMaxWindowMin: 90,
    geofenceRadiusM: 150,
  );

  factory MobileConfig.fromJson(Map<String, dynamic> json) {
    int read(String key, int fallbackValue) =>
        (json[key] as num?)?.toInt() ?? fallbackValue;
    return MobileConfig(
      trackingLeadMin: read('trackingLeadMin', 45),
      trackingIntervalSec: read('trackingIntervalSec', 600),
      trackingMaxWindowMin: read('trackingMaxWindowMin', 90),
      geofenceRadiusM: read('geofenceRadiusM', 150),
    );
  }

  Map<String, dynamic> toJson() => {
        'trackingLeadMin': trackingLeadMin,
        'trackingIntervalSec': trackingIntervalSec,
        'trackingMaxWindowMin': trackingMaxWindowMin,
        'geofenceRadiusM': geofenceRadiusM,
      };
}
