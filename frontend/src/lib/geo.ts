/**
 * Distancia geográfica y su lectura operativa. Coordinación no lee coordenadas;
 * lee "a 18 m del domicilio". Estas utilidades traducen los puntos crudos del
 * tracking a una cercanía que un operador entiende de un vistazo.
 */

const EARTH_RADIUS_M = 6_371_000;

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distancia compacta para una etiqueta: `18 m` o `1,2 km`. */
export function formatDistance(meters: number): string {
  const m = Math.round(meters);
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Lectura humana de la cercanía al domicilio. Convierte metros en algo que
 * coordinación dimensiona sin pensar: "en la puerta", "a 3 cuadras".
 */
export function describeProximity(meters: number): string {
  const m = Math.round(meters);
  if (m <= 30) return 'En la puerta del domicilio';
  if (m < 1000) {
    const cuadras = Math.max(1, Math.round(m / 100));
    return `A ${m} m (unas ${cuadras} ${cuadras === 1 ? 'cuadra' : 'cuadras'})`;
  }
  return `A ${formatDistance(m)} del domicilio`;
}

/** Punto geográfico mínimo presente en eventos y domicilios. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Lee `latitude`/`longitude` de un objeto si ambos son números finitos. */
export function readPoint(obj: unknown): GeoPoint | null {
  if (!obj || typeof obj !== 'object') return null;
  const lat = (obj as Record<string, unknown>).latitude;
  const lon = (obj as Record<string, unknown>).longitude;
  if (typeof lat === 'number' && typeof lon === 'number') {
    return { latitude: lat, longitude: lon };
  }
  return null;
}
