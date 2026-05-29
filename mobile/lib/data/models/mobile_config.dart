/// Parámetros operativos que la app obtiene de `GET /mobile/config`.
/// Definen la ventana de tracking previo al servicio, el radio de geocerca y
/// el umbral adaptativo de checkout temprano.
class MobileConfig {
  const MobileConfig({
    required this.trackingLeadMin,
    required this.trackingIntervalSec,
    required this.trackingMaxWindowMin,
    required this.geofenceRadiusM,
    required this.earlyCheckoutThresholdPct,
  });

  /// Minutos antes del inicio en que la app activa el tracking.
  final int trackingLeadMin;

  /// Frecuencia de muestreo de ubicación, en segundos.
  final int trackingIntervalSec;

  /// Ventana máxima de tracking previo al servicio, en minutos.
  final int trackingMaxWindowMin;

  /// Radio de geocerca por defecto para validar la llegada, en metros.
  final int geofenceRadiusM;

  /// Fracción del turno restante que dispara el pedido de motivo al finalizar.
  /// Ej: 0.25 = el bottom sheet aparece si al cerrar falta más del 25% del turno.
  final double earlyCheckoutThresholdPct;

  /// Valores por defecto, alineados con `config.defaults.ts` del backend.
  static const MobileConfig fallback = MobileConfig(
    trackingLeadMin: 45,
    trackingIntervalSec: 600,
    trackingMaxWindowMin: 90,
    geofenceRadiusM: 150,
    earlyCheckoutThresholdPct: 0.25,
  );

  factory MobileConfig.fromJson(Map<String, dynamic> json) {
    int readInt(String key, int fallbackValue) =>
        (json[key] as num?)?.toInt() ?? fallbackValue;
    double readDouble(String key, double fallbackValue) =>
        (json[key] as num?)?.toDouble() ?? fallbackValue;
    return MobileConfig(
      trackingLeadMin: readInt('trackingLeadMin', 45),
      trackingIntervalSec: readInt('trackingIntervalSec', 600),
      trackingMaxWindowMin: readInt('trackingMaxWindowMin', 90),
      geofenceRadiusM: readInt('geofenceRadiusM', 150),
      earlyCheckoutThresholdPct:
          readDouble('earlyCheckoutThresholdPct', 0.25),
    );
  }

  Map<String, dynamic> toJson() => {
        'trackingLeadMin': trackingLeadMin,
        'trackingIntervalSec': trackingIntervalSec,
        'trackingMaxWindowMin': trackingMaxWindowMin,
        'geofenceRadiusM': geofenceRadiusM,
        'earlyCheckoutThresholdPct': earlyCheckoutThresholdPct,
      };
}
