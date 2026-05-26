import '../api/api_client.dart';

/// Registro del token de notificaciones push (`POST /push/register-token`).
class PushRepository {
  PushRepository(this._api);

  final ApiClient _api;

  /// Registra o actualiza el token de push del dispositivo en el backend.
  Future<void> registerToken(String deviceId, String pushToken) {
    return _api.post(
      '/push/register-token',
      body: {'deviceId': deviceId, 'pushToken': pushToken},
    );
  }
}
