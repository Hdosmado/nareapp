import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/service_status.dart';
import '../data/api/api_exception.dart';
import '../data/models/assignment.dart';
import 'providers.dart';
import 'session_controller.dart';

/// Servicios asignados del prestador: la lista de hoy y el servicio actual.
class AssignmentsState {
  const AssignmentsState({this.today = const [], this.current});

  /// Servicios asignados para el día de hoy.
  final List<Assignment> today;

  /// Servicio actual o próximo (el primero aún no cerrado).
  final Assignment? current;

  /// Servicios de hoy que todavía no empezaron o están en curso.
  List<Assignment> get pendingToday =>
      today.where((a) => a.status.isOpen).toList();

  AssignmentsState copyWith({List<Assignment>? today, Assignment? current}) {
    return AssignmentsState(
      today: today ?? this.today,
      current: current ?? this.current,
    );
  }
}

/// Carga y mantiene los servicios asignados. Soporta actualizaciones
/// optimistas: al confirmar una llegada, la interfaz refleja el cambio antes
/// de que el backend responda.
class AssignmentsController extends AsyncNotifier<AssignmentsState> {
  /// Ids de servicios ya conocidos, para detectar asignaciones nuevas entre
  /// recargas y avisar localmente. Se siembra en la primera carga (no avisamos
  /// por servicios que ya existían).
  final Set<String> _knownIds = {};
  bool _seededKnown = false;

  @override
  Future<AssignmentsState> build() async {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isAuthenticated) {
      return const AssignmentsState();
    }
    final result = await _fetch();
    _notifyNewAssignments(result);
    return result;
  }

  /// Pausas crecientes entre reintentos ante un fallo transitorio. Cubren la
  /// ventana del arranque en frío en iOS: la primera conexión a la IP de la LAN
  /// puede fallar con error de red mientras el sistema todavía está levantando
  /// la red / resolviendo el permiso de red local; esa primera request ni
  /// siquiera llega al backend. Reintentando ~4s en total se recupera solo, sin
  /// que el prestador tenga que tocar "Reintentar".
  static const _retryBackoff = [
    Duration(milliseconds: 500),
    Duration(milliseconds: 1000),
    Duration(milliseconds: 2000),
  ];

  Future<AssignmentsState> _fetch() async {
    for (var attempt = 0;; attempt++) {
      try {
        return await _load();
      } on ApiException catch (e) {
        // Los errores reales (403 sin permiso, sesión vencida, recurso
        // inexistente) se propagan al toque: no tiene sentido reintentar.
        final transient =
            e.isNetworkError || (e.statusCode != null && e.statusCode! >= 500);
        if (!transient || attempt >= _retryBackoff.length) rethrow;
        await Future<void>.delayed(_retryBackoff[attempt]);
      }
    }
  }

  Future<AssignmentsState> _load() async {
    final repo = ref.read(assignmentsRepositoryProvider);
    final results = await Future.wait([repo.today(), repo.current()]);
    return AssignmentsState(
      today: results[0] as List<Assignment>,
      current: results[1] as Assignment?,
    );
  }

  /// Recarga los servicios desde el backend. No vacía el estado a "loading"
  /// para no descartar los datos ya visibles: el pull-to-refresh tiene su
  /// propio indicador y, si la recarga falla, conservamos lo último bueno en
  /// vez de tapar la pantalla con el error.
  Future<void> refresh() async {
    state = await AsyncValue.guard(() async {
      final result = await _fetch();
      _notifyNewAssignments(result);
      return result;
    });
  }

  /// Detecta servicios recién asignados (no vistos en cargas previas) y dispara
  /// una notificación local "Tenés una nueva persona a cuidar". Replica el push
  /// que envía el backend al asignar, para poder verlo en el dispositivo aunque
  /// el push remoto (FCM/APNs) no esté habilitado.
  void _notifyNewAssignments(AssignmentsState next) {
    final incoming = next.today.map((a) => a.id).toSet();
    if (!_seededKnown) {
      // Primera carga: sembramos sin avisar (no notificamos servicios viejos).
      _knownIds
        ..clear()
        ..addAll(incoming);
      _seededKnown = true;
      return;
    }
    final fresh = next.today.where((a) => !_knownIds.contains(a.id)).toList();
    _knownIds.addAll(incoming);
    if (fresh.isEmpty) return;
    final push = ref.read(pushServiceProvider);
    for (final a in fresh) {
      push.showLocalAlert(
        'Tenés una nueva persona a cuidar',
        '${a.carePerson.nombreCompleto} · ${a.address.calle}',
      );
    }
  }

  /// Aplica un cambio de estado local (optimista) a un servicio, tanto en la
  /// lista de hoy como en el servicio actual.
  void applyLocalStatus(
    String assignmentId,
    ServiceStatus status, {
    bool markCheckIn = false,
  }) {
    final data = state.value;
    if (data == null) return;

    Assignment patch(Assignment a) {
      if (a.id != assignmentId) return a;
      return a.copyWith(
        status: status,
        checkInAt: markCheckIn ? DateTime.now() : null,
      );
    }

    state = AsyncValue.data(
      AssignmentsState(
        today: data.today.map(patch).toList(),
        current: data.current == null ? null : patch(data.current!),
      ),
    );
  }
}

/// Proveedor global de los servicios asignados.
final assignmentsControllerProvider =
    AsyncNotifierProvider<AssignmentsController, AssignmentsState>(
  AssignmentsController.new,
);
