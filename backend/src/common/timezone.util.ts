/** Zona horaria operativa de la plataforma. */
export const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';

/** Desfase fijo de Argentina respecto de UTC (UTC-3, sin horario de verano). */
const AR_OFFSET_HOURS = -3;
const HOUR_MS = 3_600_000;

/** Instante actual en UTC. */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Rango UTC [start, end] que cubre el día calendario de Argentina que contiene
 * `reference`. Útil para consultar "los servicios de hoy".
 */
export function argentinaDayRangeUtc(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const offsetMs = AR_OFFSET_HOURS * HOUR_MS;
  const arWall = new Date(reference.getTime() + offsetMs);
  const year = arWall.getUTCFullYear();
  const month = arWall.getUTCMonth();
  const day = arWall.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - offsetMs);
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - offsetMs);
  return { start, end };
}

/** Diferencia en minutos entre dos instantes (`a - b`). */
export function diffMinutes(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 60_000;
}
