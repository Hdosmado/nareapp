/** Utilidades de presentación compartidas por la tabla y los formularios. */

export type Row = Record<string, unknown>;

/** Lee un valor por ruta con puntos (ej. `provider.apellido`). */
export function getValue(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

/** Formatea una fecha/hora ISO a la zona local en formato corto. */
export function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Zona de presentación del dominio (los timestamps llegan en UTC). */
const APP_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Hora del día (HH:MM) en la zona operativa. */
export function formatTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
    hour12: false,
  });
}

/** Fecha corta (día y mes) en la zona operativa. */
export function formatDateShort(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    timeZone: APP_TIMEZONE,
  });
}

/** Rango horario «HH:MM a HH:MM» de un servicio, en la zona operativa. */
export function formatTimeRange(start: unknown, end: unknown): string {
  const from = formatTime(start);
  const to = formatTime(end);
  if (from === '—') return to === '—' ? '—' : to;
  if (to === '—') return from;
  return `${from} a ${to}`;
}

/** Clave de día calendario (YYYY-MM-DD) en la zona operativa, para agrupar. */
export function dayKey(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  // en-CA da el formato ISO YYYY-MM-DD, estable para comparar y agrupar.
  return date.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

/**
 * Etiqueta del encabezado de un grupo de días: «Hoy» / «Ayer» para los dos
 * últimos, y «miércoles 3 jun» para el resto, en la zona operativa.
 */
export function dayLabel(value: unknown): string {
  const key = dayKey(value);
  if (!key) return '—';
  const now = Date.now();
  const today = new Date(now).toLocaleDateString('en-CA', {
    timeZone: APP_TIMEZONE,
  });
  const yesterday = new Date(now - 86_400_000).toLocaleDateString('en-CA', {
    timeZone: APP_TIMEZONE,
  });
  if (key === today) return 'Hoy';
  if (key === yesterday) return 'Ayer';
  return new Date(value as string).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  });
}

/** Convierte una fecha ISO al formato que espera un `<input datetime-local>`. */
export function toDateTimeLocal(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const RED = [
  'rojo', 'critica', 'ausente', 'ausente_probable', 'cancelado',
  'rechazado', 'revocado', 'suspendido', 'inactivo', 'descartada',
];
const ORANGE = ['naranja', 'alta', 'demorado', 'fuera_de_zona'];
const YELLOW = [
  'amarillo', 'media', 'pendiente', 'proximo', 'en_riesgo',
  'en_gestion', 'abierta', 'offline',
];
const GREEN = [
  'verde', 'baja', 'activo', 'aprobado', 'finalizado', 'resuelta',
  'en_servicio', 'en_camino', 'llego', 'online',
];

/** Decide el color de chip semántico para un valor de estado/riesgo. */
export function chipTone(value: string): string {
  const v = value.toLowerCase();
  if (RED.includes(v)) return 'rojo';
  if (ORANGE.includes(v)) return 'naranja';
  if (YELLOW.includes(v)) return 'amarillo';
  if (GREEN.includes(v)) return 'verde';
  // Lo que no es riesgo es metadato (tipo de dato, plataforma, categoría):
  // va en neutro, no en coral. El coral está reservado para la acción
  // (Regla de la Voz Única / de la Forma); un chip de estado nunca lo toma.
  return 'neutral';
}

/** Texto legible: reemplaza guiones bajos por espacios. */
export function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}
