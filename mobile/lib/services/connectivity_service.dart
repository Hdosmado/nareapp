import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';

/// Observa el estado de conexión del teléfono. Es la base del modo
/// offline-first: cuando vuelve la red, dispara la sincronización de la cola.
class ConnectivityService {
  ConnectivityService([Connectivity? connectivity])
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  /// `true` si hay alguna interfaz de red activa.
  Future<bool> isOnline() async {
    final result = await _connectivity.checkConnectivity();
    return _online(result);
  }

  /// Stream de cambios de conectividad expresados como `online` / `offline`.
  Stream<bool> get onStatusChange =>
      _connectivity.onConnectivityChanged.map(_online);

  bool _online(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}
