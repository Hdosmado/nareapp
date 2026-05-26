import '../../core/constants/service_status.dart';

/// Persona a cuidar: destinataria de la prestación de servicio.
class CarePerson {
  const CarePerson({
    required this.id,
    required this.nombre,
    required this.apellido,
    this.telefonoContacto,
  });

  final String id;
  final String nombre;
  final String apellido;
  final String? telefonoContacto;

  String get nombreCompleto => '$nombre $apellido'.trim();

  factory CarePerson.fromJson(Map<String, dynamic> json) {
    return CarePerson(
      id: json['id'] as String,
      nombre: (json['nombre'] as String?) ?? '',
      apellido: (json['apellido'] as String?) ?? '',
      telefonoContacto: json['telefonoContacto'] as String?,
    );
  }
}

/// Domicilio donde se presta el servicio.
class ServiceAddress {
  const ServiceAddress({
    required this.id,
    required this.calle,
    required this.ciudad,
    required this.provincia,
    this.latitude,
    this.longitude,
    required this.allowedRadiusM,
  });

  final String id;
  final String calle;
  final String ciudad;
  final String provincia;
  final double? latitude;
  final double? longitude;
  final int allowedRadiusM;

  /// El domicilio tiene coordenadas geocodificadas.
  bool get hasCoordinates => latitude != null && longitude != null;

  /// `Rosario · Santa Fe` — meta-dato de localidad.
  String get localidad => '$ciudad · $provincia';

  factory ServiceAddress.fromJson(Map<String, dynamic> json) {
    return ServiceAddress(
      id: json['id'] as String,
      calle: (json['calle'] as String?) ?? '',
      ciudad: (json['ciudad'] as String?) ?? '',
      provincia: (json['provincia'] as String?) ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      allowedRadiusM: (json['allowedRadiusM'] as num?)?.toInt() ?? 150,
    );
  }
}

/// Asignación de un prestador a un servicio: la unidad operativa que ve el
/// prestador en la app. Corresponde a `ServiceAssignment` del backend.
class Assignment {
  const Assignment({
    required this.id,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.riskLevel,
    required this.replacementRequired,
    required this.carePerson,
    required this.address,
    this.checkInAt,
    this.checkOutAt,
  });

  final String id;
  final DateTime startTime;
  final DateTime endTime;
  final ServiceStatus status;
  final String riskLevel;
  final bool replacementRequired;
  final CarePerson carePerson;
  final ServiceAddress address;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;

  /// El servicio comienza dentro de la ventana de tracking previo.
  bool startsWithin(Duration window) {
    final now = DateTime.now();
    final until = startTime.difference(now);
    return !until.isNegative && until <= window;
  }

  Assignment copyWith({ServiceStatus? status, DateTime? checkInAt}) {
    return Assignment(
      id: id,
      startTime: startTime,
      endTime: endTime,
      status: status ?? this.status,
      riskLevel: riskLevel,
      replacementRequired: replacementRequired,
      carePerson: carePerson,
      address: address,
      checkInAt: checkInAt ?? this.checkInAt,
      checkOutAt: checkOutAt,
    );
  }

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      id: json['id'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      status: ServiceStatus.fromBackend(json['status'] as String?),
      riskLevel: (json['riskLevel'] as String?) ?? 'verde',
      replacementRequired: (json['replacementRequired'] as bool?) ?? false,
      carePerson:
          CarePerson.fromJson(json['patient'] as Map<String, dynamic>),
      address:
          ServiceAddress.fromJson(json['address'] as Map<String, dynamic>),
      checkInAt: json['checkInAt'] == null
          ? null
          : DateTime.parse(json['checkInAt'] as String),
      checkOutAt: json['checkOutAt'] == null
          ? null
          : DateTime.parse(json['checkOutAt'] as String),
    );
  }
}
