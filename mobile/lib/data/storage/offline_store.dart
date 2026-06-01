import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/offline_event.dart';

/// Cola local de eventos pendientes de sincronización. Garantiza el
/// comportamiento offline-first: un evento operativo se persiste apenas se
/// genera y solo se borra cuando el backend confirma haberlo recibido.
///
/// Seguridad (M8): los eventos contienen PII y coordenadas de domicilios, así
/// que se guardan cifrados con `flutter_secure_storage` (keystore del sistema),
/// igual que la sesión, en vez de SharedPreferences en texto plano. El secure
/// storage no expone listas, así que toda la cola se serializa como un único
/// JSON array bajo una sola clave.
class OfflineStore {
  OfflineStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _queueKey = 'nareapp.offlineQueue';

  /// Clave legacy en SharedPreferences (texto plano). Se migra al storage
  /// seguro la primera vez que se lee y luego se borra.
  static const _legacyQueueKey = 'nareapp.offlineQueue';

  /// Lee la cola completa de eventos pendientes, en orden de generación.
  Future<List<OfflineEvent>> readAll() async {
    await _migrateLegacyIfNeeded();
    final raw = await _storage.read(key: _queueKey);
    return _decodeQueue(raw);
  }

  /// Agrega un evento al final de la cola.
  Future<void> add(OfflineEvent event) async {
    final current = await readAll();
    current.add(event);
    await _writeQueue(current);
  }

  /// Reemplaza la cola completa (tras una sincronización parcial o total).
  Future<void> replace(List<OfflineEvent> events) async {
    await _writeQueue(events);
  }

  /// Quita de la cola los eventos cuya clave de idempotencia ya fue aceptada.
  Future<void> removeKeys(Set<String> keys) async {
    final remaining =
        (await readAll()).where((e) => !keys.contains(e.idempotencyKey));
    await replace(remaining.toList());
  }

  /// Decodifica el JSON array persistido a eventos, tolerando entradas
  /// corruptas (no deben trabar el resto de la cola).
  List<OfflineEvent> _decodeQueue(String? raw) {
    if (raw == null || raw.isEmpty) return <OfflineEvent>[];
    final events = <OfflineEvent>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return events;
      for (final entry in decoded) {
        try {
          events.add(OfflineEvent.fromJson(entry as Map<String, dynamic>));
        } catch (_) {
          // Entrada corrupta: se ignora, no debe trabar el resto de la cola.
        }
      }
    } catch (_) {
      // Cola corrupta entera: se descarta para no romper el arranque.
    }
    return events;
  }

  /// Serializa y persiste la cola completa en el storage seguro.
  Future<void> _writeQueue(List<OfflineEvent> events) async {
    final encoded = jsonEncode(events.map((e) => e.toJson()).toList());
    await _storage.write(key: _queueKey, value: encoded);
  }

  /// Migra una cola existente de SharedPreferences (texto plano) al storage
  /// seguro. Se ejecuta una sola vez: tras migrar, borra la clave legacy. Si
  /// ya hay datos en el storage seguro, no pisa nada.
  Future<void> _migrateLegacyIfNeeded() async {
    final SharedPreferences prefs;
    try {
      prefs = await SharedPreferences.getInstance();
    } catch (_) {
      // En plataformas sin SharedPreferences (o tests) no hay nada que migrar.
      return;
    }
    final legacy = prefs.getStringList(_legacyQueueKey);
    if (legacy == null) return;

    // Solo migramos si el storage seguro todavía no tiene cola, para no pisar
    // eventos nuevos generados después de actualizar la app.
    final existing = await _storage.read(key: _queueKey);
    if (existing == null || existing.isEmpty) {
      final events = <OfflineEvent>[];
      for (final entry in legacy) {
        try {
          events.add(
            OfflineEvent.fromJson(jsonDecode(entry) as Map<String, dynamic>),
          );
        } catch (_) {
          // Entrada legacy corrupta: se descarta.
        }
      }
      if (events.isNotEmpty) {
        await _writeQueue(events);
      }
    }
    // En cualquier caso borramos el rastro en texto plano.
    await prefs.remove(_legacyQueueKey);
  }
}
