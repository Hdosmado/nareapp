import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../data/models/mobile_config.dart';
import '../data/models/offline_event.dart';
import '../services/location_service.dart';
import 'providers.dart';
import 'sync_controller.dart';

/// Estado del tracking de ubicación previo al servicio.
class TrackingState {
  const TrackingState({
    this.active = false,
    this.assignmentId,
    this.sampleCount = 0,
  });

  /// El foreground service de ubicación está corriendo.
  final bool active;

  /// Servicio para el que se está compartiendo la ubicación.
  final String? assignmentId;

  /// Cantidad de puntos de ubicación capturados en esta ventana.
  final int sampleCount;

  TrackingState copyWith({
    bool? active,
    String? assignmentId,
    int? sampleCount,
  }) {
    return TrackingState(
      active: active ?? this.active,
      assignmentId: assignmentId ?? this.assignmentId,
      sampleCount: sampleCount ?? this.sampleCount,
    );
  }
}

/// Administra la ventana de tracking previo al servicio.
///
/// El GPS **no** corre de forma permanente: este controlador solo se activa en
/// la ventana previa a un servicio y se detiene en cuanto el prestador
/// confirma la llegada. Mientras corre, hay un foreground service con
/// notificación visible (divulgación previa, no seguimiento encubierto).
class TrackingController extends Notifier<TrackingState> {
  StreamSubscription<Position>? _subscription;
  final _uuid = const Uuid();

  @override
  TrackingState build() {
    ref.onDispose(() => _subscription?.cancel());
    return const TrackingState();
  }

  /// Inicia el tracking para un servicio. Devuelve el resultado del permiso
  /// de ubicación: si no fue concedido, el tracking no arranca.
  Future<LocationPermissionResult> start(
    String assignmentId,
    MobileConfig config,
  ) async {
    if (state.active) return LocationPermissionResult.granted;

    final location = ref.read(locationServiceProvider);
    final permission = await location.ensurePermission();
    if (permission != LocationPermissionResult.granted) {
      return permission;
    }

    _subscription = location
        .preServiceTrackingStream(config.trackingIntervalSec)
        .listen((position) => _onPosition(assignmentId, position));

    state = TrackingState(active: true, assignmentId: assignmentId);
    return LocationPermissionResult.granted;
  }

  /// Detiene el tracking (al confirmar la llegada o al cerrar la ventana).
  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
    state = const TrackingState();
  }

  Future<void> _onPosition(String assignmentId, Position position) async {
    final event = OfflineEvent(
      idempotencyKey: _uuid.v4(),
      type: OfflineEventType.preServiceLocation,
      assignmentId: assignmentId,
      timestampLocal: DateTime.now(),
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
    );
    await ref.read(syncControllerProvider.notifier).recordEvent(event);
    state = state.copyWith(sampleCount: state.sampleCount + 1);
  }
}

/// Proveedor global del tracking previo al servicio.
final trackingControllerProvider =
    NotifierProvider<TrackingController, TrackingState>(
  TrackingController.new,
);
