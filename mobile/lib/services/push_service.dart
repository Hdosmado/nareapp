/// Servicio de notificaciones push.
///
/// El MVP no integra Firebase: no hay `google-services.json` ni SDK de FCM.
/// Esta es la interfaz lista para que, cuando se sume Firebase, solo cambie
/// la implementación — el resto de la app (registro del token en el backend)
/// ya queda cableado.
abstract class PushService {
  /// Inicializa el servicio (permisos, canales). Sin efecto en el stub.
  Future<void> init();

  /// Token del dispositivo para push, o `null` si no hay proveedor activo.
  Future<String?> obtainToken();
}

/// Implementación de reemplazo sin proveedor real. Devuelve un token
/// determinístico derivado del `deviceId`, suficiente para ejercitar el
/// endpoint `POST /push/register-token` de punta a punta.
class StubPushService implements PushService {
  StubPushService(this._deviceId);

  final String _deviceId;

  @override
  Future<void> init() async {
    // Sin proveedor de push: nada que inicializar.
  }

  @override
  Future<String?> obtainToken() async {
    return 'stub-push-token:$_deviceId';
  }
}
