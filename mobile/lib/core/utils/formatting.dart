/// Utilidades de formato de fecha y hora en castellano rioplatense, sin
/// dependencias externas de localización. Los `DateTime` del backend vienen en
/// UTC; se muestran en la hora local del teléfono.
class Fmt {
  Fmt._();

  static const _months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  static const _weekdays = [
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
    'domingo',
  ];

  static String _two(int n) => n.toString().padLeft(2, '0');

  /// Hora del día, formato 24h: `09:45`.
  static String time(DateTime dt) {
    final local = dt.toLocal();
    return '${_two(local.hour)}:${_two(local.minute)}';
  }

  /// Rango horario de un servicio: `09:45 — 13:45`.
  static String timeRange(DateTime start, DateTime end) {
    return '${time(start)} — ${time(end)}';
  }

  /// Fecha larga relativa: `Hoy`, `Mañana` o `lunes 12 de mayo`.
  static String relativeDate(DateTime dt) {
    final local = DateTime(dt.toLocal().year, dt.toLocal().month, dt.toLocal().day);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final diff = local.difference(today).inDays;
    if (diff == 0) return 'Hoy';
    if (diff == 1) return 'Mañana';
    if (diff == -1) return 'Ayer';
    return longDate(dt);
  }

  /// Fecha larga: `lunes 12 de mayo`.
  static String longDate(DateTime dt) {
    final local = dt.toLocal();
    final wd = _weekdays[(local.weekday - 1) % 7];
    return '$wd ${local.day} de ${_months[local.month - 1]}';
  }

  /// Fecha corta: `12/05`.
  static String shortDate(DateTime dt) {
    final local = dt.toLocal();
    return '${_two(local.day)}/${_two(local.month)}';
  }
}
