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
/// La ubicación es **automática** durante la ventana del servicio (desde
/// `tracking.lead_min` antes del inicio hasta `tracking.trail_min` después del
/// fin) y no se apaga desde la app. Mientras corre hay un foreground service
/// con notificación visible: es divulgación explícita, no seguimiento
/// encubierto. El permiso ideal es "Siempre" (always + background); si el
/// prestador concede solo "Durante el uso" o lo niega, la app no se bloquea
/// pero el backend lo registra como bandera para coordinación.
class LocationService {
  /// Solicita —si hace falta— el permiso de ubicación, escalando a "Siempre"
  /// cuando es posible, y verifica que el servicio del sistema esté encendido.
  Future<LocationPermissionResult> ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionResult.serviceDisabled;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    // Intento de escalar a "Siempre": en Android 11+ esto deriva a Ajustes;
    // en iOS el sistema ofrece el upgrade en un segundo momento. No bloquea.
    if (permission == LocationPermission.whileInUse) {
      final escalated = await Geolocator.requestPermission();
      if (escalated == LocationPermission.always) {
        permission = escalated;
      }
    }

    return _mapPermission(permission);
  }

  /// Verifica el permiso **sin** pedirlo. Lo usa el arranque automático del
  /// tracking para no abrir diálogos del sistema en segundo plano.
  Future<LocationPermissionResult> checkPermissionOnly() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionResult.serviceDisabled;
    }
    return _mapPermission(await Geolocator.checkPermission());
  }

  /// Nivel de permiso actual en el formato que entiende el backend:
  /// 'siempre' | 'durante_uso' | 'denegado' | 'desconocido'.
  Future<String> currentPermissionWire() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return 'denegado';
    }
    switch (await Geolocator.checkPermission()) {
      case LocationPermission.always:
        return 'siempre';
      case LocationPermission.whileInUse:
        return 'durante_uso';
      case LocationPermission.denied:
      case LocationPermission.deniedForever:
        return 'denegado';
      case LocationPermission.unableToDetermine:
        return 'desconocido';
    }
  }

  LocationPermissionResult _mapPermission(LocationPermission permission) {
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

  /// Stream de latidos de ubicación de la ventana de tracking automático.
  ///
  /// En Android corre como **foreground service** con una notificación
  /// permanente y visible: el prestador siempre sabe que se está compartiendo
  /// la ubicación. Es divulgación explícita, no seguimiento encubierto. Se
  /// detiene solo al cerrarse la ventana del servicio (fin + trail).
  Stream<Position> trackingStream(int intervalSeconds) {
    final settings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      intervalDuration: Duration(seconds: intervalSeconds),
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationTitle: 'NareApp comparte tu ubicación',
        notificationText:
            'Coordinación ve tu ubicación mientras dura el servicio. Se '
            'detiene solo al finalizar.',
        enableWakeLock: true,
        setOngoing: true,
      ),
    );
    return Geolocator.getPositionStream(locationSettings: settings);
  }

  /// Abre la pantalla de Ajustes de la app (permisos rechazados para siempre).
  Future<void> openSettings() => Geolocator.openAppSettings();
}
