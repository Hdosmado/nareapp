import 'provider_summary.dart';

/// Sesión activa del prestador: el par de tokens JWT más sus datos básicos.
/// Se persiste en almacenamiento seguro y es la credencial de toda la app.
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.provider,
  });

  final String accessToken;
  final String refreshToken;
  final ProviderSummary provider;

  AuthSession copyWith({String? accessToken, String? refreshToken}) {
    return AuthSession(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      provider: provider,
    );
  }

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'provider': provider.toJson(),
      };

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      provider:
          ProviderSummary.fromJson(json['provider'] as Map<String, dynamic>),
    );
  }
}
