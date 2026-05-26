import '../api/api_client.dart';
import '../models/offline_event.dart';

/// Resultado de sincronizar un evento individual del lote.
class SyncResult {
  const SyncResult({required this.idempotencyKey, required this.ok, this.message});

  final String idempotencyKey;
  final bool ok;
  final String? message;

  factory SyncResult.fromJson(Map<String, dynamic> json) {
    return SyncResult(
      idempotencyKey: json['idempotencyKey'] as String,
      ok: json['status'] == 'ok',
      message: json['message'] as String?,
    );
  }
}

/// Sincronización en diferido de la cola offline (`POST /sync/events`).
/// El endpoint es idempotente: reenviar un evento ya aceptado no duplica nada.
class SyncRepository {
  SyncRepository(this._api);

  final ApiClient _api;

  /// Empuja un lote de eventos y devuelve el resultado por cada uno.
  Future<List<SyncResult>> pushBatch(List<OfflineEvent> events) async {
    final data = await _api.post(
      '/sync/events',
      body: {'events': events.map((e) => e.toSyncJson()).toList()},
    );
    final list = (data as List).cast<Map<String, dynamic>>();
    return list.map(SyncResult.fromJson).toList();
  }
}
