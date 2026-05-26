/**
 * Enumeraciones del dominio, replicadas del backend (`src/common/enums.ts`).
 * Se usan para poblar los selects de los formularios del panel.
 */

export const UserRole = ['admin', 'coordinador'] as const;
export const UserStatus = ['activo', 'inactivo'] as const;

export const ProviderType = [
  'asistente_terapeutico',
  'supervisor',
  'auditor_medico',
  'enfermero',
  'cuidadora',
] as const;
export const ProviderStatus = ['activo', 'inactivo', 'suspendido'] as const;

export const PatientStatus = ['activo', 'inactivo'] as const;

export const DevicePlatform = ['android', 'ios'] as const;
export const DeviceStatus = [
  'pendiente',
  'aprobado',
  'rechazado',
  'revocado',
  'reemplazado',
] as const;

export const ServiceStatus = [
  'pendiente',
  'asignado',
  'en_curso',
  'finalizado',
  'cancelado',
] as const;

export const AssignmentStatus = [
  'pendiente',
  'proximo',
  'en_riesgo',
  'en_camino',
  'demorado',
  'llego',
  'en_servicio',
  'finalizado',
  'ausente_probable',
  'ausente',
  'cancelado',
] as const;

export const RiskLevel = ['verde', 'amarillo', 'naranja', 'rojo'] as const;

export const AttendanceType = ['check_in', 'check_out'] as const;

export const ConnectivityStatus = ['online', 'offline', 'unknown'] as const;

export const AlertType = [
  'sin_senal_30',
  'lejos_15',
  'inicio_vencido',
  'ausencia_probable',
  'fuera_de_zona',
  'app_sin_conexion',
  'bateria_baja',
  'device_no_aprobado',
  'sin_prestador',
] as const;
export const AlertSeverity = ['baja', 'media', 'alta', 'critica'] as const;
export const AlertStatus = [
  'abierta',
  'en_gestion',
  'resuelta',
  'descartada',
] as const;

export const CoordinationActionType = [
  'llamar_prestador',
  'enviar_notificacion',
  'marcar_contactado',
  'marcar_reemplazo_requerido',
  'asignar_reemplazo',
  'aprobar_excepcion',
  'resolver_alerta',
] as const;

export const AppConfigType = ['number', 'string', 'boolean'] as const;

/** Mapea un valor de riesgo a la clase de chip correspondiente. */
export function riskTone(value: string): string {
  if (RiskLevel.includes(value as (typeof RiskLevel)[number])) return value;
  return 'neutral';
}
