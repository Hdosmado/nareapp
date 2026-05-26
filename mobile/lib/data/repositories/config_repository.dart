import '../api/api_client.dart';
import '../models/mobile_config.dart';
import '../storage/config_store.dart';

/// Configuración operativa de la app (`GET /mobile/config`), con caché local
/// para tolerar arranques sin conexión.
class ConfigRepository {
  ConfigRepository(this._api, this._store);

  final ApiClient _api;
  final ConfigStore _store;

  /// Obtiene la configuración del backend y la cachea. Si la red falla, cae
  /// en la caché y, en último caso, en los valores por defecto.
  Future<MobileConfig> load() async {
    try {
      final data = await _api.get('/mobile/config') as Map<String, dynamic>;
      final config = MobileConfig.fromJson(data);
      await _store.write(config);
      return config;
    } catch (_) {
      return (await _store.read()) ?? MobileConfig.fallback;
    }
  }
}
