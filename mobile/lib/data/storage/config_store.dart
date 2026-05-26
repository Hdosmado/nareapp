import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/mobile_config.dart';

/// Caché local de la configuración operativa (`/mobile/config`). Permite que
/// la app conozca la ventana de tracking y el radio de geocerca aunque arranque
/// sin conexión.
class ConfigStore {
  static const _key = 'nareapp.mobileConfig';

  Future<MobileConfig?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return null;
    try {
      return MobileConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> write(MobileConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(config.toJson()));
  }
}
