import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/offline_event.dart';

/// Cola local de eventos pendientes de sincronización. Garantiza el
/// comportamiento offline-first: un evento operativo se persiste apenas se
/// genera y solo se borra cuando el backend confirma haberlo recibido.
class OfflineStore {
  static const _queueKey = 'nareapp.offlineQueue';

  /// Lee la cola completa de eventos pendientes, en orden de generación.
  Future<List<OfflineEvent>> readAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_queueKey) ?? const [];
    final events = <OfflineEvent>[];
    for (final entry in raw) {
      try {
        events.add(
          OfflineEvent.fromJson(jsonDecode(entry) as Map<String, dynamic>),
        );
      } catch (_) {
        // Entrada corrupta: se ignora, no debe trabar el resto de la cola.
      }
    }
    return events;
  }

  /// Agrega un evento al final de la cola.
  Future<void> add(OfflineEvent event) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_queueKey) ?? <String>[];
    raw.add(jsonEncode(event.toJson()));
    await prefs.setStringList(_queueKey, raw);
  }

  /// Reemplaza la cola completa (tras una sincronización parcial o total).
  Future<void> replace(List<OfflineEvent> events) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      _queueKey,
      events.map((e) => jsonEncode(e.toJson())).toList(),
    );
  }

  /// Quita de la cola los eventos cuya clave de idempotencia ya fue aceptada.
  Future<void> removeKeys(Set<String> keys) async {
    final remaining =
        (await readAll()).where((e) => !keys.contains(e.idempotencyKey));
    await replace(remaining.toList());
  }
}
