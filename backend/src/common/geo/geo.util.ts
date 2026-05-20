/** Radio medio de la Tierra en metros. */
const EARTH_RADIUS_M = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Distancia en metros entre dos coordenadas usando la fórmula de Haversine.
 * Es suficiente para validar la llegada al domicilio y medir cercanía durante
 * la ventana de tracking previa al servicio.
 */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(a));
}

/** Indica si un punto cae dentro del radio (en metros) respecto del destino. */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusM: number,
): boolean {
  return distanceMeters(lat1, lon1, lat2, lon2) <= radiusM;
}

/**
 * Estimación simple de tiempo de llegada en minutos, asumiendo una velocidad
 * urbana promedio. Es informativa: el motor de riesgo no depende de ella.
 */
export function estimatedArrivalMinutes(
  distanceM: number,
  urbanSpeedKmh = 25,
): number {
  const speedMPerMin = (urbanSpeedKmh * 1000) / 60;
  return distanceM / speedMPerMin;
}
