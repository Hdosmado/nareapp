import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/config/env.dart';

/// Guarda una URL de backend elegida en tiempo de ejecución, que tiene
/// prioridad sobre la compilada con `--dart-define`. Sirve para apuntar la app
/// a distintos servidores (emulador, IP de red local) sin recompilar.
///
/// Seguridad (H16): poder reapuntar la app a un server arbitrario es un vector
/// para redirigirla a un backend malicioso. Por eso:
///  - La sobreescritura SOLO está disponible en builds de debug (`kDebugMode`).
///    En release la URL queda fijada a la compilada y no se puede cambiar.
///  - Incluso en debug, solo se aceptan URLs https o hosts de la allowlist de
///    desarrollo (emulador/loopback/IP de LAN). Así se evita degradar a HTTP
///    contra un host cualquiera por error.
class ServerConfigStore {
  static const _key = 'nareapp.backendUrl';

  /// Hosts de desarrollo a los que se permite apuntar por HTTP en claro.
  /// Coincide con la allowlist de red de Android/iOS. Las IPs de LAN privadas
  /// (10.x, 172.16-31.x, 192.168.x) también se aceptan por HTTP en dev.
  static const _devHttpHosts = {'10.0.2.2', 'localhost', '127.0.0.1'};

  /// `true` si en este build se puede cambiar la URL del backend. Solo en
  /// debug: en release la app queda clavada al backend compilado.
  bool get canOverrideUrl => kDebugMode;

  /// URL de backend efectiva: la guardada en el dispositivo o, si no hay, la
  /// compilada por defecto. En release se ignora cualquier valor guardado
  /// (defensa en profundidad: aunque alguien escriba la clave, no se usa).
  Future<String> effectiveUrl() async {
    if (!canOverrideUrl) return Env.backendBaseUrl;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved != null && saved.trim().isNotEmpty && _isAllowed(saved.trim())) {
      return saved.trim();
    }
    return Env.backendBaseUrl;
  }

  /// Persiste una URL de backend elegida por el usuario. Devuelve `true` si se
  /// guardó; `false` si el build no permite sobreescritura o la URL no pasa la
  /// validación (no es https ni un host de desarrollo conocido).
  Future<bool> save(String url) async {
    if (!canOverrideUrl) return false;
    final trimmed = url.trim();
    if (!_isAllowed(trimmed)) return false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, trimmed);
    return true;
  }

  /// Valida que la URL sea https o apunte a un host de desarrollo permitido por
  /// HTTP. Rechaza esquemas distintos de http/https y URLs malformadas.
  bool _isAllowed(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) return false;
    if (uri.scheme == 'https') return true;
    if (uri.scheme != 'http') return false;
    // HTTP en claro: solo contra hosts de desarrollo conocidos o IPs privadas.
    final host = uri.host;
    return _devHttpHosts.contains(host) || _isPrivateLanHost(host);
  }

  /// Reconoce IPs de redes privadas (RFC 1918), típicas de un backend de dev
  /// en la LAN: 10.x.x.x, 172.16-31.x.x, 192.168.x.x.
  bool _isPrivateLanHost(String host) {
    final octets = host.split('.');
    if (octets.length != 4) return false;
    final parts = octets.map(int.tryParse).toList();
    if (parts.any((o) => o == null || o < 0 || o > 255)) return false;
    final a = parts[0]!;
    final b = parts[1]!;
    if (a == 10) return true;
    if (a == 172 && b >= 16 && b <= 31) return true;
    if (a == 192 && b == 168) return true;
    return false;
  }
}
