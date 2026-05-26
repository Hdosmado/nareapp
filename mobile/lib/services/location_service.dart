import 'package:geolocator/geolocator.dart';

/// Desenlace de la solicitud de permiso de ubicación.
enum LocationPermissionResult {
  /// Permiso concedido: la app puede usar el GPS.
  granted,

  /// El prestador rechazó el permiso esta vez.
  denied,

  /// El permiso fue rechazado de forma permanente: hay que ir a Ajustes.
  deniedForever,

  /// El servicio de ubicación del teléfono está apagado.
  serviceDisabled,
}

/// Acceso al GPS del teléfono.
///
/// Política de privacidad: el GPS **no** corre de forma permanente. Solo se
/// usa en la ventana previa al servicio (con un foreground service y su
/// notificación visible) y al confirmar la llegada. Al tocar LLEGUÉ, el
/// seguimiento se corta.
class LocationService {
  /// Solicita —si hace falta— el permiso de ubicación y verifica que el
  /// servicio del sistema esté encendido.
  Future<LocationPermissionResult> ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionResult.serviceDisabled;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    switch (permission) {
      case LocationPermission.denied:
        return LocationPermissionResult.denied;
      case LocationPermission.deniedForever:
        return LocationPermissionResult.deniedForever;
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        return LocationPermissionResult.granted;
      case LocationPermission.unableToDetermine:
        return LocationPermissionResult.denied;
    }
  }

  /// Lee la ubicación actual una sola vez (usado al confirmar la llegada).
  /// Devuelve `null` si no se pudo obtener una posición a tiempo.
  Future<Position?> currentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  /// Stream de ubicaciones de la ventana de tracking previo al servicio.
  ///
  /// En Android corre como **foreground service** con una notificación
  /// permanente y visible: el prestador siempre sabe que se está compartiendo
  /// la ubicación. Es divulgación explícita, no seguimiento encubierto.
  Stream<Position> preServiceTrackingStream(int intervalSeconds) {
    final settings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      intervalDuration: Duration(seconds: intervalSeconds),
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationTitle: 'NareApp comparte tu ubicación',
        notificationText:
            'Coordinación ve tu llegada al domicilio. Se detiene cuando '
            'confirmás LLEGUÉ.',
        enableWakeLock: true,
        setOngoing: true,
      ),
    );
    return Geolocator.getPositionStream(locationSettings: settings);
  }

  /// Abre la pantalla de Ajustes de la app (permisos rechazados para siempre).
  Future<void> openSettings() => Geolocator.openAppSettings();
}
