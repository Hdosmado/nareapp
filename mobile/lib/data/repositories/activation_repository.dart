import '../../services/device_identity.dart';
import '../api/api_client.dart';
import '../models/auth_session.dart';
import '../models/provider_summary.dart';

/// Activación del teléfono del prestador contra el endpoint público
/// `POST /mobile/activation/claim`. La credencial es el código numérico de 8
/// dígitos (mecanismo principal) o el token del QR (secundario).
class ActivationRepository {
  ActivationRepository(this._api);

  final ApiClient _api;

  /// Activa la app con el código numérico de 8 dígitos. El código puede
  /// llegar con guiones o espacios: el backend lo normaliza.
  Future<AuthSession> claimWithCode(
    String activationCode,
    DeviceProfile device, {
    String? pushToken,
  }) {
    return _claim(
      {'activationCode': activationCode},
      device,
      pushToken: pushToken,
    );
  }

  /// Activa la app con el token largo extraído de un QR escaneado.
  Future<AuthSession> claimWithToken(
    String activationToken,
    DeviceProfile device, {
    String? pushToken,
  }) {
    return _claim(
      {'activationToken': activationToken},
      device,
      pushToken: pushToken,
    );
  }

  Future<AuthSession> _claim(
    Map<String, dynamic> credential,
    DeviceProfile device, {
    String? pushToken,
  }) async {
    final data = await _api.post('/mobile/activation/claim', body: {
      ...credential,
      'deviceId': device.deviceId,
      'platform': device.platform,
      'model': device.model,
      'osVersion': device.osVersion,
      'appVersion': device.appVersion,
      'pushToken': ?pushToken,
    }) as Map<String, dynamic>;

    return AuthSession(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      provider:
          ProviderSummary.fromJson(data['provider'] as Map<String, dynamic>),
    );
  }
}
