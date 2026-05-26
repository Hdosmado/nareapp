import '../api/api_client.dart';
import '../models/assignment.dart';

/// Consulta de los servicios asignados del prestador (`/assignments/*`).
class AssignmentsRepository {
  AssignmentsRepository(this._api);

  final ApiClient _api;

  /// Servicios asignados del día (`GET /assignments/today`).
  Future<List<Assignment>> today() async {
    final data = await _api.get('/assignments/today');
    final list = (data as List).cast<Map<String, dynamic>>();
    return list.map(Assignment.fromJson).toList();
  }

  /// Servicio actual o próximo (`GET /assignments/current`), o `null` si no
  /// hay ninguno abierto.
  Future<Assignment?> current() async {
    final data = await _api.get('/assignments/current');
    if (data == null) return null;
    return Assignment.fromJson(data as Map<String, dynamic>);
  }
}
