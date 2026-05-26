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
  return 'accent';
}

/** Texto legible: reemplaza guiones bajos por espacios. */
export function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}
