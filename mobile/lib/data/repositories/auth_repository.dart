import '../api/api_client.dart';
import '../models/auth_session.dart';
import '../models/provider_summary.dart';

/// Acceso a la autenticación del prestador: el login de reingreso cuando la
/// app ya estuvo activada pero la sesión se perdió.
class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  /// Inicia sesión con email y contraseña (`POST /auth/login`).
  Future<AuthSession> login(String email, String password) async {
    final data = await _api.post(
      '/auth/login',
      body: {'email': email.trim(), 'password': password},
    ) as Map<String, dynamic>;
    return AuthSession(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      provider:
          ProviderSummary.fromJson(data['provider'] as Map<String, dynamic>),
    );
  }
}
