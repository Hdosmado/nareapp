import '../api/api_client.dart';
import '../models/offline_event.dart';

/// Envío de eventos operativos a sus endpoints directos cuando hay conexión:
/// confirmación de llegada, fin de servicio y ubicación previa al servicio.
/// Si no hay red, la capa de estado los encola y los sincroniza después.
class AttendanceRepository {
  AttendanceRepository(this._api);

  final ApiClient _api;

  /// Confirma la llegada (`POST /assignments/:id/check-in`).
  Future<void> checkIn(OfflineEvent event) {
    return _api.post(
      '/assignments/${event.assignmentId}/check-in',
      body: event.toDirectJson(),
    );
  }

  /// Cierra el servicio (`POST /assignments/:id/check-out`).
  Future<void> checkOut(OfflineEvent event) {
    return _api.post(
      '/assignments/${event.assignmentId}/check-out',
      body: event.toDirectJson(),
    );
  }

  /// Registra un punto de la ventana de tracking previo
  /// (`POST /assignments/:id/pre-service-location`).
  Future<void> recordPreServiceLocation(OfflineEvent event) {
    return _api.post(
      '/assignments/${event.assignmentId}/pre-service-location',
      body: event.toDirectJson(),
    );
  }
}
