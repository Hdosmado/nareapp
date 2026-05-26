import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import '../models/auth_session.dart';

/// Almacenamiento seguro de la sesión del prestador. El JWT no se guarda nunca
/// en texto plano: usa el keystore del sistema (`flutter_secure_storage`).
class SessionStore {
  SessionStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _sessionKey = 'nareapp.session';
  static const _deviceIdKey = 'nareapp.deviceId';

  /// Lee la sesión persistida, o `null` si la app no está activada.
  Future<AuthSession?> readSession() async {
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null) return null;
    try {
      return AuthSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      // Sesión corrupta: se descarta para forzar una reactivación limpia.
      await _storage.delete(key: _sessionKey);
      return null;
    }
  }

  /// Persiste la sesión activa.
  Future<void> writeSession(AuthSession session) {
    return _storage.write(
      key: _sessionKey,
      value: jsonEncode(session.toJson()),
    );
  }

  /// Borra la sesión (desvinculación del dispositivo).
  Future<void> clearSession() => _storage.delete(key: _sessionKey);

  /// Devuelve el `deviceId` lógico estable del teléfono, generándolo y
  /// guardándolo la primera vez. Es la identidad del dispositivo frente al
  /// backend y se mantiene aunque se cierre la sesión.
  Future<String> deviceId() async {
    final existing = await _storage.read(key: _deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final fresh = const Uuid().v4();
    await _storage.write(key: _deviceIdKey, value: fresh);
    return fresh;
  }
}
