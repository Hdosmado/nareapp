import 'package:shared_preferences/shared_preferences.dart';

import '../../core/config/env.dart';

/// Guarda una URL de backend elegida en tiempo de ejecución, que tiene
/// prioridad sobre la compilada con `--dart-define`. Sirve para apuntar la app
/// a distintos servidores (emulador, IP de red local) sin recompilar.
class ServerConfigStore {
  static const _key = 'nareapp.backendUrl';

  /// URL de backend efectiva: la guardada en el dispositivo o, si no hay, la
  /// compilada por defecto.
  Future<String> effectiveUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved != null && saved.trim().isNotEmpty) return saved.trim();
    return Env.backendBaseUrl;
  }

  /// Persiste una URL de backend elegida por el usuario.
  Future<void> save(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, url.trim());
  }
}
