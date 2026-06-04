/**
 * Presentación de alertas operativas: traduce los enums crudos del backend a
 * lenguaje de coordinación y define el orden de triage. El color del semáforo
 * lo lleva la severidad; el tipo aporta el «qué pasó».
 */

/** Severidad de mayor a menor urgencia. Gobierna el orden de la lista. */
const SEVERITY_ORDER = ['critica', 'alta', 'media', 'baja'] as const;

/** Posición de triage de una severidad (menor = más urgente, va arriba). */
export function severityRank(severity: string): number {
  const idx = SEVERITY_ORDER.indexOf(severity as (typeof SEVERITY_ORDER)[number]);
  return idx === -1 ? SEVERITY_ORDER.length : idx;
}

/** Severidades conocidas, ya ordenadas, para recorrer los grupos. */
export const SEVERITIES = SEVERITY_ORDER;

/** Etiqueta legible de la severidad. */
export function severityLabel(severity: string): string {
  switch (severity) {
    case 'critica':
      return 'Crítica';
    case 'alta':
      return 'Alta';
    case 'media':
      return 'Media';
    case 'baja':
      return 'Baja';
    default:
      return severity;
  }
}

/** Tono del semáforo (verde/amarillo/naranja/rojo) para una severidad. */
export function severityTone(severity: string): string {
  switch (severity) {
    case 'critica':
      return 'rojo';
    case 'alta':
      return 'naranja';
    case 'media':
      return 'amarillo';
    default:
      return 'verde';
  }
}

/** Etiqueta del estado de gestión de la alerta. */
export function alertStatusLabel(status: string): string {
  switch (status) {
    case 'abierta':
      return 'Abierta';
    case 'en_gestion':
      return 'En gestión';
    case 'resuelta':
      return 'Resuelta';
    case 'descartada':
      return 'Descartada';
    default:
      return status;
  }
}

interface AlertTypeCopy {
  /** Título del tipo de alerta, en lenguaje de coordinación. */
  label: string;
  /** Una línea sobre qué significa, para saber por qué llamar. */
  detail: string;
}

const TYPE_COPY: Record<string, AlertTypeCopy> = {
  ausencia_probable: {
    label: 'Ausencia probable',
    detail: 'El prestador no dio señales de que vaya a llegar al servicio.',
  },
  inicio_vencido: {
    label: 'Inicio vencido',
    detail: 'Pasó la hora de inicio y todavía no se registró la llegada.',
  },
  lejos_15: {
    label: 'Lejos del domicilio',
    detail: 'Faltan 15 minutos y el prestador sigue lejos del domicilio.',
  },
  fuera_de_zona: {
    label: 'Fuera de zona',
    detail: 'El prestador está fuera de la zona prevista para el servicio.',
  },
  sin_senal_30: {
    label: 'Sin señal hace 30 minutos',
    detail: 'No se reciben ubicaciones del prestador desde hace 30 minutos.',
  },
  sin_senal_en_servicio: {
    label: 'Sin señal durante el servicio',
    detail: 'Se cortó la señal del prestador mientras presta el servicio.',
  },
  salio_durante_servicio: {
    label: 'Salió durante el servicio',
    detail: 'El prestador se alejó del domicilio sin registrar el fin.',
  },
  app_sin_conexion: {
    label: 'App sin conexión',
    detail: 'La app del prestador no se conecta al servidor.',
  },
  bateria_baja: {
    label: 'Batería baja',
    detail: 'El equipo del prestador está por quedarse sin batería.',
  },
  sin_permiso_ubicacion: {
    label: 'Sin permiso de ubicación',
    detail: 'El prestador no concedió permiso de ubicación en su equipo.',
  },
  device_no_aprobado: {
    label: 'Dispositivo no aprobado',
    detail: 'El equipo del prestador todavía no fue aprobado por coordinación.',
  },
  sin_prestador: {
    label: 'Sin prestador asignado',
    detail: 'El servicio no tiene un prestador asignado que lo cubra.',
  },
};

/** Título legible del tipo de alerta. */
export function alertTypeLabel(type: string): string {
  return TYPE_COPY[type]?.label ?? type.replace(/_/g, ' ');
}

/** Explicación de una línea del tipo de alerta (puede ser vacía). */
export function alertTypeDetail(type: string): string {
  return TYPE_COPY[type]?.detail ?? '';
}
