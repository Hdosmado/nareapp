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
const GOOGLE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Si hay key de Google Maps con la Geocoding API habilitada, se usa Google
 * (cobertura de calles muy superior en Argentina). Si no, o si Google falla,
 * se cae a Nominatim (OpenStreetMap). La key se expone en el bundle: debe estar
 * restringida por referrer HTTP en Google Cloud Console.
 */
const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

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

/**
 * Abreviaturas habituales de calles argentinas. OpenStreetMap suele guardar el
 * nombre completo ("Doctor Luis Vila"), así que "Dr Luis Vila" no matchea si no
 * se expande. Se aplican como palabra completa, con punto opcional.
 */
const STREET_ABBR: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bdr\.?\b/gi, 'Doctor'],
  [/\bdra\.?\b/gi, 'Doctora'],
  [/\bav\.?\b/gi, 'Avenida'],
  [/\bavda\.?\b/gi, 'Avenida'],
  [/\bbv\.?\b/gi, 'Bulevar'],
  [/\bblvd\.?\b/gi, 'Bulevar'],
  [/\bgral\.?\b/gi, 'General'],
  [/\btte\.?\b/gi, 'Teniente'],
  [/\bcnel\.?\b/gi, 'Coronel'],
  [/\bing\.?\b/gi, 'Ingeniero'],
  [/\barq\.?\b/gi, 'Arquitecto'],
  [/\bprof\.?\b/gi, 'Profesor'],
  [/\bpte\.?\b/gi, 'Presidente'],
  [/\bpdte\.?\b/gi, 'Presidente'],
  [/\bpje\.?\b/gi, 'Pasaje'],
  [/\bsgto\.?\b/gi, 'Sargento'],
  [/\balte\.?\b/gi, 'Almirante'],
];

/** Expande las abreviaturas de calle más comunes. */
function expandStreetAbbreviations(calle: string): string {
  return STREET_ABBR.reduce((acc, [re, full]) => acc.replace(re, full), calle);
}

/** Quita la altura (número final) para caer al centro de la calle como fallback. */
function stripHouseNumber(calle: string): string {
  return calle.replace(/\s+\d+\s*$/, '').trim();
}

/** Arma la cadena de búsqueda a partir de las partes no vacías. */
function buildQuery(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/** Una llamada concreta a Nominatim. Lanza si la red falla. */
async function runSearch(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
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

/** Búsqueda con Google Geocoding. Lanza si la API rechaza o la red falla. */
async function runGoogleSearch(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const url = new URL(GOOGLE_BASE);
  url.searchParams.set('address', query);
  url.searchParams.set('components', 'country:AR');
  url.searchParams.set('language', 'es');
  url.searchParams.set('key', GOOGLE_KEY as string);

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Google respondió ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };
  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Google Geocoding: ${data.status}`);
  }
  return data.results.map((r) => ({
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
    displayName: r.formatted_address,
  }));
}

/** Cascada de Nominatim (fallback): tal cual, abreviaturas, sin altura. */
async function nominatimCascade(
  q: AddressQuery,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const calle = q.calle?.trim() ?? '';
  const expanded = expandStreetAbbreviations(calle);
  const variants = [
    buildQuery([calle, q.ciudad, q.provincia]),
    expanded !== calle ? buildQuery([expanded, q.ciudad, q.provincia]) : '',
    buildQuery([stripHouseNumber(expanded), q.ciudad, q.provincia]),
  ].filter((query, i, all) => query && all.indexOf(query) === i);

  for (const query of variants) {
    const results = await runSearch(query, signal);
    if (results.length > 0) return results;
    if (signal?.aborted) return [];
  }
  return [];
}

/**
 * Geocodifica una dirección argentina. Usa Google si hay key con la Geocoding
 * API habilitada (mejor cobertura de calles); si no hay key o Google falla, cae
 * a la cascada de Nominatim. Devuelve candidatos por relevancia (el primero es
 * el más probable).
 */
export async function geocodeAddress(
  q: AddressQuery,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const calle = q.calle?.trim() ?? '';
  if (!calle) return [];

  if (GOOGLE_KEY) {
    try {
      const query = buildQuery([calle, q.ciudad, q.provincia]);
      const results = await runGoogleSearch(query, signal);
      if (results.length > 0) return results;
    } catch (err) {
      if (signal?.aborted) return [];
      // Config pendiente (API sin habilitar / key restringida) o red: se avisa
      // por consola y se intenta con OpenStreetMap para no romper el alta.
      console.warn('[geocode] Google falló, usando OpenStreetMap:', err);
    }
  }

  return nominatimCascade(q, signal);
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
  if (GOOGLE_KEY) {
    try {
      const url = new URL(GOOGLE_BASE);
      url.searchParams.set('latlng', `${latitude},${longitude}`);
      url.searchParams.set('language', 'es');
      url.searchParams.set('key', GOOGLE_KEY);
      const res = await fetch(url, { signal });
      if (res.ok) {
        const data = (await res.json()) as {
          status: string;
          results: Array<{ formatted_address: string }>;
        };
        if (data.status === 'OK' && data.results[0]) {
          return data.results[0].formatted_address;
        }
      }
    } catch {
      // Cae a Nominatim abajo.
    }
  }

  const url = new URL('/reverse', NOMINATIM_BASE);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');

  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'es' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}
