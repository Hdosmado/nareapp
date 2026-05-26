/**
 * Enumeraciones del dominio operativo de NareApp.
 * La nomenclatura es coherente con el modelo operativo/legal: prestador,
 * prestación de servicio, cobertura, ausencia, tardanza, reemplazo.
 */

/** Rol del usuario del panel web de coordinación. */
export enum UserRole {
  ADMIN = 'admin',
  COORDINADOR = 'coordinador',
}

/** Estado de un usuario del panel. */
export enum UserStatus {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}

/** Tipo de prestador que presta el servicio domiciliario. */
export enum ProviderType {
  ASISTENTE_TERAPEUTICO = 'asistente_terapeutico',
  SUPERVISOR = 'supervisor',
  AUDITOR_MEDICO = 'auditor_medico',
  ENFERMERO = 'enfermero',
  CUIDADORA = 'cuidadora',
}

/** Estado de un prestador. */
export enum ProviderStatus {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  SUSPENDIDO = 'suspendido',
}

/** Estado de la persona a cuidar. */
export enum PatientStatus {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}

/** Plataforma del dispositivo mobile del prestador. */
export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
}

/**
 * Estado de un dispositivo del prestador.
 * En el flujo de activación por QR, `APROBADO` equivale a "dispositivo activo":
 * el dispositivo queda operativo en el mismo acto de reclamar el QR, sin pasar
 * por `PENDIENTE`. `REEMPLAZADO` habilita una nueva activación.
 */
export enum DeviceStatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  REVOCADO = 'revocado',
  REEMPLAZADO = 'reemplazado',
}

/** Estado de un token de activación por QR del dispositivo del prestador. */
export enum ActivationTokenStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

/** Estado de un servicio (la prestación a cubrir). */
export enum ServiceStatus {
  PENDIENTE = 'pendiente',
  ASIGNADO = 'asignado',
  EN_CURSO = 'en_curso',
  FINALIZADO = 'finalizado',
  CANCELADO = 'cancelado',
}

/** Estado operativo de la asignación de un prestador a un servicio. */
export enum AssignmentStatus {
  PENDIENTE = 'pendiente',
  PROXIMO = 'proximo',
  EN_RIESGO = 'en_riesgo',
  EN_CAMINO = 'en_camino',
  DEMORADO = 'demorado',
  LLEGO = 'llego',
  EN_SERVICIO = 'en_servicio',
  FINALIZADO = 'finalizado',
  AUSENTE_PROBABLE = 'ausente_probable',
  AUSENTE = 'ausente',
  CANCELADO = 'cancelado',
}

/** Nivel de riesgo operativo calculado por el motor de riesgo. */
export enum RiskLevel {
  VERDE = 'verde',
  AMARILLO = 'amarillo',
  NARANJA = 'naranja',
  ROJO = 'rojo',
}

/** Tipo de evento de asistencia. */
export enum AttendanceType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

/** Estado de conectividad reportado por la app mobile. */
export enum ConnectivityStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

/** Tipo de alerta operativa. */
export enum AlertType {
  SIN_SENAL_30 = 'sin_senal_30',
  LEJOS_15 = 'lejos_15',
  INICIO_VENCIDO = 'inicio_vencido',
  AUSENCIA_PROBABLE = 'ausencia_probable',
  FUERA_DE_ZONA = 'fuera_de_zona',
  APP_SIN_CONEXION = 'app_sin_conexion',
  BATERIA_BAJA = 'bateria_baja',
  DEVICE_NO_APROBADO = 'device_no_aprobado',
  SIN_PRESTADOR = 'sin_prestador',
}

/** Severidad de una alerta operativa. */
export enum AlertSeverity {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

/** Estado de gestión de una alerta operativa. */
export enum AlertStatus {
  ABIERTA = 'abierta',
  EN_GESTION = 'en_gestion',
  RESUELTA = 'resuelta',
  DESCARTADA = 'descartada',
}

/** Tipo de acción tomada por coordinación sobre un servicio. */
export enum CoordinationActionType {
  LLAMAR_PRESTADOR = 'llamar_prestador',
  ENVIAR_NOTIFICACION = 'enviar_notificacion',
  MARCAR_CONTACTADO = 'marcar_contactado',
  MARCAR_REEMPLAZO_REQUERIDO = 'marcar_reemplazo_requerido',
  ASIGNAR_REEMPLAZO = 'asignar_reemplazo',
  APROBAR_EXCEPCION = 'aprobar_excepcion',
  RESOLVER_ALERTA = 'resolver_alerta',
}
