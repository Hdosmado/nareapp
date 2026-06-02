/**
 * Selector de ubicación de un domicilio. Reemplaza la carga manual de latitud
 * y longitud: toma calle/ciudad/provincia del formulario, las geocodifica con
 * Nominatim (OpenStreetMap) y muestra un pin arrastrable sobre el mapa. El
 * coordinador confirma o corrige el punto; el widget escribe `latitude` y
 * `longitude` en el estado del formulario.
 *
 * El radio de cobertura (anti-fraude, motor de riesgo) se mide desde este
 * punto, así que poder verificarlo de un vistazo es parte del objetivo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ARGENTINA_CENTER,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  homeIcon,
} from '../lib/leaflet';
import {
  geocodeAddress,
  hasEnoughAddress,
  reverseGeocode,
  type GeocodeResult,
} from '../lib/geocode';
import { Icon } from './Icon';

type Status = 'idle' | 'loading' | 'empty' | 'error';

/** Convierte un valor del formulario en número, o null si no es válido. */
function asNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function AddressLocationPicker({
  values,
  set,
}: {
  values: Record<string, unknown>;
  set: (name: string, value: unknown) => void;
}) {
  const calle = String(values.calle ?? '');
  const ciudad = String(values.ciudad ?? '');
  const provincia = String(values.provincia ?? '');
  const lat = asNumber(values.latitude);
  const lng = asNumber(values.longitude);
  const hasCoords = lat !== null && lng !== null;

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [candidates, setCandidates] = useState<GeocodeResult[]>([]);
  const [label, setLabel] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  // Sube cada vez que hay que recentrar el mapa por una búsqueda o selección,
  // pero NO al arrastrar el pin (así el mapa no "salta" mientras lo movés).
  const [recenter, setRecenter] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  const setCoords = useCallback(
    (nextLat: number, nextLng: number) => {
      set('latitude', nextLat);
      set('longitude', nextLng);
    },
    [set],
  );

  const search = useCallback(
    async (auto: boolean) => {
      if (!hasEnoughAddress({ calle, ciudad, provincia })) {
        if (!auto) {
          setStatus('error');
          setErrorMsg('Completá al menos calle y ciudad para buscar la ubicación.');
        }
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      lastQueryRef.current = `${calle}|${ciudad}|${provincia}`;
      setStatus('loading');
      setErrorMsg('');
      try {
        const results = await geocodeAddress(
          { calle, ciudad, provincia },
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        if (results.length === 0) {
          setCandidates([]);
          setStatus('empty');
          return;
        }
        setCandidates(results);
        setStatus('idle');
        const best = results[0];
        setCoords(best.latitude, best.longitude);
        setLabel(best.displayName);
        setRecenter((k) => k + 1);
      } catch {
        if (ctrl.signal.aborted) return;
        setStatus('error');
        setErrorMsg('No se pudo consultar el mapa. Reintentá o ajustá el punto a mano.');
      }
    },
    [calle, ciudad, provincia, setCoords],
  );

  // Auto-geocodificar al completar/editar la dirección, sólo mientras no haya
  // un punto elegido (para no pisar un pin ya confirmado). Con debounce para
  // respetar el límite de ~1 req/s de Nominatim.
  useEffect(() => {
    if (hasCoords) return;
    if (!hasEnoughAddress({ calle, ciudad, provincia })) return;
    if (`${calle}|${ciudad}|${provincia}` === lastQueryRef.current) return;
    const timer = setTimeout(() => void search(true), 800);
    return () => clearTimeout(timer);
  }, [calle, ciudad, provincia, hasCoords, search]);

  // Cancela cualquier request en vuelo al desmontar.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Mueve el pin a un punto elegido manualmente (drag o click en el mapa) y
  // refresca la etiqueta con la dirección inversa (no bloqueante).
  const placeManually = useCallback(
    (nextLat: number, nextLng: number) => {
      setCoords(nextLat, nextLng);
      setStatus('idle');
      setCandidates([]);
      void reverseGeocode(nextLat, nextLng)
        .then((name) => setLabel(name))
        .catch(() => undefined);
    },
    [setCoords],
  );

  const pick = (result: GeocodeResult) => {
    setCoords(result.latitude, result.longitude);
    setLabel(result.displayName);
    setRecenter((k) => k + 1);
    setCandidates([]);
  };

  const center: [number, number] = hasCoords
    ? [lat as number, lng as number]
    : ARGENTINA_CENTER;

  return (
    <div className="field field--wide">
      <label className="field__label">Ubicación en el mapa</label>
      <div className="geopicker">
        <div className="geopicker__bar">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void search(false)}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <Icon name="spinner" size={14} className="spin" />
            ) : (
              <Icon name="search" size={14} />
            )}
            {status === 'loading' ? 'Buscando…' : 'Buscar ubicación'}
          </button>
          {hasCoords && (
            <span className="geopicker__coords muted">
              <Icon name="pin" size={13} />
              {(lat as number).toFixed(6)}, {(lng as number).toFixed(6)}
            </span>
          )}
        </div>

        {label && <div className="geopicker__label muted">{label}</div>}

        {status === 'empty' && (
          <div className="banner banner--warn">
            <Icon name="alert" size={15} className="banner__icon" />
            <span>
              No se encontró la dirección. Ajustá el texto, tocá el mapa para
              ubicar el punto, o cargá las coordenadas a mano.
            </span>
          </div>
        )}
        {status === 'error' && errorMsg && (
          <div className="banner banner--error">
            <Icon name="alert" size={15} className="banner__icon" />
            <span>{errorMsg}</span>
          </div>
        )}

        {candidates.length > 1 && (
          <ul className="geopicker__list">
            {candidates.map((c, i) => (
              <li key={`${c.latitude},${c.longitude},${i}`}>
                <button
                  type="button"
                  className="geopicker__option"
                  onClick={() => pick(c)}
                >
                  <Icon name="pin" size={13} />
                  <span>{c.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="geopicker__map">
          <MapContainer
            center={center}
            zoom={hasCoords ? 16 : 5}
            scrollWheelZoom
            style={{ height: 300, width: '100%' }}
          >
            <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
            <InvalidateOnMount />
            <ClickToPlace onPick={placeManually} />
            <Recenter trigger={recenter} lat={lat} lng={lng} />
            {hasCoords && (
              <Marker
                draggable
                icon={homeIcon()}
                position={[lat as number, lng as number]}
                eventHandlers={{
                  dragend: (e) => {
                    const p = e.target.getLatLng();
                    placeManually(p.lat, p.lng);
                  },
                }}
              />
            )}
          </MapContainer>
        </div>

        <div className="field__hint">
          Buscá la dirección y arrastrá el pin para ajustarlo. El radio de
          cobertura del prestador se mide desde este punto.
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setManualOpen((v) => !v)}
        >
          <Icon name="chevron-down" size={14} />
          {manualOpen ? 'Ocultar ajuste manual' : 'Ajuste manual de coordenadas'}
        </button>
        {manualOpen && (
          <div className="geopicker__manual">
            <div className="field">
              <label className="field__label" htmlFor="geo-lat">
                Latitud
              </label>
              <input
                id="geo-lat"
                className="field__control"
                type="number"
                step="any"
                value={lat ?? ''}
                onChange={(e) =>
                  set('latitude', e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="geo-lng">
                Longitud
              </label>
              <input
                id="geo-lng"
                className="field__control"
                type="number"
                step="any"
                value={lng ?? ''}
                onChange={(e) =>
                  set('longitude', e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Recentra el mapa cuando cambia `trigger` (búsqueda o selección), no al arrastrar. */
function Recenter({
  trigger,
  lat,
  lng,
}: {
  trigger: number;
  lat: number | null;
  lng: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (lat === null || lng === null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 16));
    // Sólo al cambiar `trigger`: arrastrar el pin cambia lat/lng pero no debe
    // forzar un recentrado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

/** Permite fijar el punto tocando directamente el mapa. */
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recalcula el tamaño del mapa tras montarse dentro del modal (evita el render gris). */
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}
