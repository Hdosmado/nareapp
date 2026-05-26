/// Datos mínimos del prestador que el backend devuelve al activar la app o al
/// iniciar sesión. La app no maneja el perfil completo del prestador.
class ProviderSummary {
  const ProviderSummary({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.tipoPrestador,
  });

  final String id;
  final String nombre;
  final String apellido;
  final String tipoPrestador;

  /// Nombre y apellido para encabezados ("Hola, {nombre}").
  String get nombreCompleto => '$nombre $apellido'.trim();

  /// Tipo de prestador legible (el backend lo manda en `snake_case`).
  String get tipoLegible {
    switch (tipoPrestador) {
      case 'asistente_terapeutico':
        return 'Asistente terapéutico';
      case 'supervisor':
        return 'Supervisor';
      case 'auditor_medico':
        return 'Auditor médico';
      case 'enfermero':
        return 'Enfermero';
      case 'cuidadora':
        return 'Cuidadora';
      default:
        return tipoPrestador;
    }
  }

  factory ProviderSummary.fromJson(Map<String, dynamic> json) {
    return ProviderSummary(
      id: json['id'] as String,
      nombre: (json['nombre'] as String?) ?? '',
      apellido: (json['apellido'] as String?) ?? '',
      tipoPrestador: (json['tipoPrestador'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nombre': nombre,
        'apellido': apellido,
        'tipoPrestador': tipoPrestador,
      };
}
