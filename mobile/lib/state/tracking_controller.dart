import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:uuid/uuid.dart';

import '../core/constants/service_status.dart';
import '../data/models/assignment.dart';
import '../data/models/mobile_config.dart';
import '../data/models/offline_event.dart';
import '../services/location_service.dart';
import 'assignments_controller.dart';
import 'providers.dart';
import 'sync_controller.dart';

/// Cada cuánto se reevalúa la ventana de tracking (arranque/parada automática).
const _evaluationTick = Duration(seconds: 30);

/// Ventana de tracking automático de una asignación: `[inicio - lead, fin +
/// trail]`. Pura (sin Flutter) para poder testearla.
class TrackingWindow {
  const TrackingWindow._();

  static bool contains(Assignment a, MobileConfig config, DateTime now) {
    final start =
        a.startTime.subtract(Duration(minutes: config.trackingLeadMin));
    final end = a.endTime.add(Duration(minutes: config.trackingTrailMin));
    return !now.isBefore(start) && !now.isAfter(end);
  }
}

/// Elige qué asignación debe estar bajo tracking ahora: la que cae dentro de su
/// ventana y no está cancelada/ausente. Prioriza la que está en servicio y, a
/// igualdad, la de inicio más cercano. Devuelve `null` si ninguna corresponde.
Assignment? pickTrackingAssignment(
  List<Assignment> today,
  MobileConfig config,
  DateTime now,
) {
  final candidates = today
      .where((a) =>
          a.status != ServiceStatus.cancelado &&
          a.status != ServiceStatus.ausente &&
          TrackingWindow.contains(a, config, now))
      .toList()
    ..sort((a, b) {
      int rank(Assignment x) => x.status.isArrived ? 0 : 1;
      final byRank = rank(a).compareTo(rank(b));
      if (byRank != 0) return byRank;
      return a.startTime.compareTo(b.startTime);
    });
  return candidates.isEmpty ? null : candidates.first;
}

/// Estado del tracking automático de ubicación.
class TrackingState {
  const TrackingState({
    this.active = false,
    this.assignmentId,
    this.sampleCount = 0,
    this.permissionGranted = true,
    this.permissionAlways = true,
  });

  /// El foreground service de ubicación está corriendo.
  final bool active;

  /// Servicio para el que se está compartiendo la ubicación.
  final String? assignmentId;

  /// Cantidad de latidos de ubicación enviados en esta ventana.
  final int sampleCount;

  /// El permiso de ubicación está concedido (al menos "durante el uso").
  final bool permissionGranted;

  /// El permiso es "Siempre" (el necesario para operar con la app cerrada).
  final bool permissionAlways;

  TrackingState copyWith({
    bool? active,
    String? assignmentId,
    int? sampleCount,
    bool? permissionGranted,
    bool? permissionAlways,
  }) {
    return TrackingState(
      active: active ?? this.active,
      assignmentId: assignmentId ?? this.assignmentId,
      sampleCount: sampleCount ?? this.sampleCount,
      permissionGranted: permissionGranted ?? this.permissionGranted,
      permissionAlways: permissionAlways ?? this.permissionAlways,
    );
  }
}

/// Administra la ventana de tracking de forma **automática**: el prestador no
/// la enciende ni la apaga. Arranca sola `tracking.lead_min` antes del inicio,
/// sigue durante todo el servicio (incluso tras "LLEGUÉ" y tras "Fin de
/// servicio") y se detiene recién `tracking.trail_min` después del fin.
///
/// La única forma de cortarla es revocando el permiso desde los Ajustes del
/// sistema; eso queda registrado como bandera (el backend deja de recibir
/// latidos y genera la alerta correspondiente). Mientras corre hay un
/// foreground service con notificación visible.
class TrackingController extends Notifier<TrackingState> {
  StreamSubscription<Position>? _subscription;
  Timer? _ticker;
  String? _targetAssignmentId;
  final _uuid = const Uuid();

  /// Cadencia objetivo de latidos (de la config). El stream de GPS puede
  /// emitir mucho más seguido —en iOS el `intervalDuration` no aplica— así que
  /// usamos esto para frenar y enviar como mucho un latido por intervalo.
  int _intervalSec = 600;

  /// Momento del último latido efectivamente enviado, para frenar la cadencia.
  DateTime? _lastPingAt;

  @override
  TrackingState build() {
    ref.onDispose(() {
      _ticker?.cancel();
      _subscription?.cancel();
    });
    // Reevaluar cuando cambian las asignaciones (alta, cambio de estado, etc.).
    ref.listen<AsyncValue<AssignmentsState>>(
      assignmentsControllerProvider,
      (_, _) => _evaluate(),
    );
    // Tick periódico: abre y cierra la ventana sin intervención del prestador.
    _ticker = Timer.periodic(_evaluationTick, (_) => _evaluate());
    Future.microtask(_evaluate);
    return const TrackingState();
  }

  /// Decide, según la ventana de cada servicio, si debe tracker y para cuál.
  Future<void> _evaluate() async {
    final data = ref.read(assignmentsControllerProvider).value;
    if (data == null) return;
    final config =
        ref.read(mobileConfigProvider).value ?? MobileConfig.fallback;
    final target = pickTrackingAssignment(data.today, config, DateTime.now());

    if (target == null) {
      if (state.active || _targetAssignmentId != null) {
        await _stop();
      }
      return;
    }
    // Ya estamos trackeando esa asignación: nada que hacer.
    if (state.active && _targetAssignmentId == target.id) {
      return;
    }
    if (state.active && _targetAssignmentId != target.id) {
      await _stop();
    }
    await _startFor(target, config);
  }

  Future<void> _startFor(Assignment assignment, MobileConfig config) async {
    final location = ref.read(locationServiceProvider);
    // No se piden permisos en segundo plano (eso lo hace la pantalla de
    // permisos, acción explícita del prestador): solo se consulta el estado.
    final permission = await location.checkPermissionOnly();

    if (permission != LocationPermissionResult.granted) {
      // No se bloquea la app: se deja la bandera. Sin latidos, el backend
      // levanta la alerta (SIN_SENAL_EN_SERVICIO / SIN_PERMISO_UBICACION).
      _targetAssignmentId = assignment.id;
      await _subscription?.cancel();
      _subscription = null;
      state = TrackingState(
        active: false,
        assignmentId: assignment.id,
        permissionGranted: false,
        permissionAlways: false,
      );
      return;
    }

    final permissionWire = await location.currentPermissionWire();
    _targetAssignmentId = assignment.id;
    _intervalSec = config.trackingIntervalSec;
    // Nueva ventana: el primer latido sale de inmediato.
    _lastPingAt = null;
    _subscription = location
        .trackingStream(config.trackingIntervalSec)
        .listen((position) => _onPosition(assignment.id, position));
    state = TrackingState(
      active: true,
      assignmentId: assignment.id,
      permissionGranted: true,
      permissionAlways: permissionWire == 'siempre',
    );
  }

  Future<void> _stop() async {
    await _subscription?.cancel();
    _subscription = null;
    _targetAssignmentId = null;
    _lastPingAt = null;
    state = const TrackingState();
  }

  Future<void> _onPosition(String assignmentId, Position position) async {
    // Freno de cadencia: el stream de GPS puede emitir cada pocos segundos
    // (en iOS el intervalo del stream no se respeta), así que enviamos como
    // mucho un latido por `trackingIntervalSec`, igual en ambas plataformas.
    // Se setea ANTES de los await para que la ráfaga de emisiones rápidas no
    // pase el filtro mientras este latido está en vuelo.
    final now = DateTime.now();
    if (_lastPingAt != null &&
        now.difference(_lastPingAt!) < Duration(seconds: _intervalSec)) {
      return;
    }
    _lastPingAt = now;

    final permissionWire =
        await ref.read(locationServiceProvider).currentPermissionWire();
    final event = OfflineEvent(
      idempotencyKey: _uuid.v4(),
      type: OfflineEventType.preServiceLocation,
      assignmentId: assignmentId,
      timestampLocal: DateTime.now(),
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      locationPermission: permissionWire,
      // Bandera anti-spoofing del latido: la app solo la reporta; el backend
      // recalcula la geocerca y evalúa el fraude.
      isMocked: position.isMocked,
    );
    await ref.read(syncControllerProvider.notifier).recordEvent(event);
    state = state.copyWith(
      sampleCount: state.sampleCount + 1,
      permissionAlways: permissionWire == 'siempre',
    );
  }
}

/// Proveedor global del tracking automático. Debe estar siendo observado (lo
/// hace la pantalla principal) para que el planificador quede activo.
final trackingControllerProvider =
    NotifierProvider<TrackingController, TrackingState>(
  TrackingController.new,
);
