import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/service_status.dart';
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
  @override
  Future<AssignmentsState> build() async {
    final session = ref.watch(sessionControllerProvider);
    if (!session.isAuthenticated) {
      return const AssignmentsState();
    }
    return _fetch();
  }

  Future<AssignmentsState> _fetch() async {
    final repo = ref.read(assignmentsRepositoryProvider);
    final results = await Future.wait([repo.today(), repo.current()]);
    return AssignmentsState(
      today: results[0] as List<Assignment>,
      current: results[1] as Assignment?,
    );
  }

  /// Recarga los servicios desde el backend.
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_fetch);
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
