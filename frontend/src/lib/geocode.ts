/**
 * Cliente de geocodificación contra Nominatim (OpenStreetMap) para el panel.
 * Convierte la dirección de un domicilio (calle/ciudad/provincia) en
 * coordenadas y permite la operación inversa cuando se arrastra el pin.
 *
 * El uso es de bajo volumen (alta de domicilios desde el backoffice), así que
 * respetamos la política de uso de Nominatim: un request a la vez y con
 * debounce (~1 req/s). El single-flight y el debounce los maneja el componente
 * que consume estas funciones; acá sólo se hacen las llamadas.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/** Coordenada resuelta más su descripción legible. */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/** Partes de una dirección a geocodificar. */
export interface AddressQuery {
  calle?: string;
  ciudad?: string;
  provincia?: string;
}

/** Indica si la dirección tiene datos suficientes para intentar geocodificar. */
export function hasEnoughAddress(q: AddressQuery): boolean {
  return Boolean(q.calle?.trim() && q.ciudad?.trim());
}

/** Arma la cadena de búsqueda a partir de las partes no vacías. */
function buildQuery(q: AddressQuery): string {
  return [q.calle, q.ciudad, q.provincia]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Geocodifica una dirección argentina. Devuelve hasta 5 candidatos ordenados
 * por relevancia (el primero es el más probable). Lanza si la red falla.
 */
export async function geocodeAddress(
  q: AddressQuery,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const query = buildQuery(q);
  if (!query) return [];

  const url = new URL('/search', NOMINATIM_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'ar');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  return data
    .map((d) => ({
      latitude: Number(d.lat),
      longitude: Number(d.lon),
      displayName: d.display_name,
    }))
    .filter((d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude));
}

/**
 * Geocodificación inversa: dado un punto, devuelve su dirección legible.
 * Se usa para mostrar a qué corresponde el pin tras arrastrarlo o tocar el
 * mapa. Devuelve null si no hay resultado o la red falla (no es crítica).
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = new URL('/reverse', NOMINATIM_BASE);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');

  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'es' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}
