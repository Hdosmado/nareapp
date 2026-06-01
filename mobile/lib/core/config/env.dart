/// Configuración de entorno de la app.
///
/// La URL del backend se inyecta en tiempo de compilación con
/// `--dart-define=BACKEND_URL=http://IP_LOCAL:3000`. El valor por defecto
/// apunta a una IP de red local (no `localhost`): un teléfono físico no
/// resuelve `localhost` contra la máquina de desarrollo.
class Env {
  Env._();

  /// URL base del backend NestJS, sin el sufijo `/api`.
  static const String backendBaseUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://192.168.1.95:3000',
  );

  /// URL base de la API REST (el backend monta todo bajo `/api`).
  static String get apiBaseUrl => '$backendBaseUrl/api';

  /// Versión de la app reportada al backend en la activación.
  static const String appVersion = '1.0.0';
}
