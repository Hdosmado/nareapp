/// Tipo de evento operativo que la app puede generar y, si hace falta,
/// encolar para sincronizar más tarde. Los valores coinciden con
/// `SyncEventType` del backend.
enum OfflineEventType {
  checkIn('check_in'),
  checkOut('check_out'),
  preServiceLocation('pre_service_location');

  const OfflineEventType(this.wire);

  /// Valor que viaja en el cuerpo de `/sync/events`.
  final String wire;

  static OfflineEventType fromWire(String value) {
    return OfflineEventType.values.firstWhere((t) => t.wire == value);
  }
}

/// Evento operativo (llegada, fin de servicio o punto de ubicación) con su
/// clave de idempotencia. La app lo persiste localmente y lo sincroniza:
/// nunca se pierde un evento aunque falle la red.
class OfflineEvent {
  OfflineEvent({
    required this.idempotencyKey,
    required this.type,
    required this.assignmentId,
    required this.timestampLocal,
    this.latitude,
    this.longitude,
    this.accuracy,
    this.exceptionReason,
    this.earlyCheckoutReason,
    this.locationPermission,
    this.isMocked,
  });

  /// Clave de idempotencia: el backend descarta reenvíos con la misma clave.
  final String idempotencyKey;
  final OfflineEventType type;
  final String assignmentId;
  final DateTime timestampLocal;
  final double? latitude;
  final double? longitude;
  final double? accuracy;

  /// Motivo cuando la llegada se confirma fuera del radio del domicilio.
  final String? exceptionReason;

  /// Motivo opcional al finalizar antes del horario previsto.
  final String? earlyCheckoutReason;

  /// Nivel de permiso de ubicación en el latido ('siempre' | 'durante_uso' |
  /// 'denegado' | 'desconocido'). Lo usa el control anti-fraude en servicio.
  final String? locationPermission;

  /// Bandera anti-spoofing: `true` si el sistema marcó esta posición como
  /// simulada (`Position.isMocked`). La app NO decide "estoy dentro": solo
  /// reporta coords + esta bandera; el backend recalcula la geocerca y evalúa
  /// el fraude. Contrato con el backend: clave JSON `isMocked`.
  final bool? isMocked;

  /// Cuerpo de un elemento del lote `POST /sync/events`.
  Map<String, dynamic> toSyncJson() => {
        'type': type.wire,
        'assignmentId': assignmentId,
        'idempotencyKey': idempotencyKey,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        'timestampLocal': timestampLocal.toUtc().toIso8601String(),
        if (exceptionReason != null) 'exceptionReason': exceptionReason,
        if (earlyCheckoutReason != null)
          'earlyCheckoutReason': earlyCheckoutReason,
        if (locationPermission != null)
          'locationPermission': locationPermission,
        if (isMocked != null) 'isMocked': isMocked,
      };

  /// Cuerpo de los endpoints directos de asistencia/tracking.
  Map<String, dynamic> toDirectJson() => {
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
        'timestampLocal': timestampLocal.toUtc().toIso8601String(),
        'idempotencyKey': idempotencyKey,
        if (exceptionReason != null) 'exceptionReason': exceptionReason,
        if (earlyCheckoutReason != null)
          'earlyCheckoutReason': earlyCheckoutReason,
        if (locationPermission != null)
          'locationPermission': locationPermission,
        if (isMocked != null) 'isMocked': isMocked,
      };

  Map<String, dynamic> toJson() => {
        'idempotencyKey': idempotencyKey,
        'type': type.wire,
        'assignmentId': assignmentId,
        'timestampLocal': timestampLocal.toIso8601String(),
        'latitude': latitude,
        'longitude': longitude,
        'accuracy': accuracy,
        'exceptionReason': exceptionReason,
        'earlyCheckoutReason': earlyCheckoutReason,
        'locationPermission': locationPermission,
        'isMocked': isMocked,
      };

  factory OfflineEvent.fromJson(Map<String, dynamic> json) {
    return OfflineEvent(
      idempotencyKey: json['idempotencyKey'] as String,
      type: OfflineEventType.fromWire(json['type'] as String),
      assignmentId: json['assignmentId'] as String,
      timestampLocal: DateTime.parse(json['timestampLocal'] as String),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      accuracy: (json['accuracy'] as num?)?.toDouble(),
      exceptionReason: json['exceptionReason'] as String?,
      earlyCheckoutReason: json['earlyCheckoutReason'] as String?,
      locationPermission: json['locationPermission'] as String?,
      isMocked: json['isMocked'] as bool?,
    );
  }
}
