import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import { Icon } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { EmptyState, ErrorState } from '../components/states';

/** Punto geográfico devuelto por el backend. */
interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface AddressPoint extends GeoPoint {
  calle: string;
  ciudad: string;
  provincia: string;
}

interface LastLocationPoint extends GeoPoint {
  accuracy: number | null;
  batteryLevel: number | null;
  connectivityStatus: string;
  timestampServer: string;
}

/** Respuesta de GET /coordination/services/:id/last-location. */
interface LastLocationResult {
  assignmentId: string;
  address: AddressPoint | null;
  lastLocation: LastLocationPoint | null;
  distanceMeters: number | null;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/** Carga única y diferida del script de Google Maps JS API. */
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as { google?: { maps?: unknown } };
    if (w.google?.maps) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('No se pudo cargar Google Maps. Revisá la clave.'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

type MapsStatus = 'no-key' | 'loading' | 'ready' | 'error';

/** Estado de carga del script de Google Maps. */
function useGoogleMaps(): MapsStatus {
  const [status, setStatus] = useState<MapsStatus>(
    MAPS_API_KEY ? 'loading' : 'no-key',
  );
  useEffect(() => {
    if (!MAPS_API_KEY) return;
    let active = true;
    loadGoogleMaps(MAPS_API_KEY)
      .then(() => active && setStatus('ready'))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, []);
  return status;
}

/** Hora `HH:MM` de un valor ISO. */
function hhmm(value: unknown): string {
  if (!value) return '';
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Distancia formateada en metros o kilómetros. */
function formatDistance(meters: number | null): string {
  if (meters === null) return 'No disponible';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Mapa operativo: domicilio del servicio y ubicación del prestador. */
export function MapPage() {
  const [assignmentId, setAssignmentId] = useState('');
  const mapsStatus = useGoogleMaps();

  const today = useQuery({
    queryKey: ['map-services-today'],
    queryFn: () => apiFetch<Row[]>('/coordination/services/today'),
  });

  const location = useQuery({
    queryKey: ['service-last-location', assignmentId],
    queryFn: () =>
      apiFetch<LastLocationResult>(
        `/coordination/services/${assignmentId}/last-location`,
      ),
    enabled: Boolean(assignmentId),
  });

  const assignments = today.data ?? [];

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">Operación</div>
          <h1 className="pagehead__title">Mapa operativo</h1>
          <p className="pagehead__desc">
            Domicilio del servicio y última ubicación conocida del prestador en
            la ventana previa al inicio.
          </p>
        </div>
        <div className="pagehead__actions">
          <button
            className="btn"
            onClick={() => {
              void today.refetch();
              if (assignmentId) void location.refetch();
            }}
          >
            <Icon name="refresh" size={15} />
            Actualizar
          </button>
        </div>
      </div>

      <section className="card">
        <div className="card__head">
          <div className="card__title">Servicio asignado</div>
        </div>
        <div className="card__body">
          {today.isLoading && (
            <div className="skeleton" style={{ height: 44 }} />
          )}
          {today.isError && (
            <ErrorState error={today.error} onRetry={() => today.refetch()} />
          )}
          {today.data && assignments.length === 0 && (
            <div className="row gap-2 muted">
              <Icon name="calendar" size={16} />
              No hay servicios asignados para hoy.
            </div>
          )}
          {today.data && assignments.length > 0 && (
            <div className="field">
              <label className="field__label" htmlFor="map-assignment">
                <b>Elegí un servicio de hoy</b>
              </label>
              <select
                id="map-assignment"
                className="field__control"
                value={assignmentId}
                onChange={(e) => setAssignmentId(e.target.value)}
              >
                <option value="">Seleccionar servicio asignado…</option>
                {assignments.map((a) => {
                  const aId = String(a.id ?? '');
                  const ciudad = String(
                    getValue(a, 'city') ?? getValue(a, 'ciudad') ?? 'Servicio',
                  );
                  const hora = hhmm(getValue(a, 'startTime'));
                  const estado = humanize(
                    String(getValue(a, 'status') ?? ''),
                  );
                  return (
                    <option key={aId} value={aId}>
                      {[ciudad, hora, estado].filter(Boolean).join(' · ')}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </section>

      {!assignmentId && (
        <EmptyState
          icon="pin"
          title="Elegí un servicio para ver el mapa"
          text="Seleccioná un servicio asignado del día para ubicar el domicilio y al prestador."
        />
      )}

      {assignmentId && location.isLoading && (
        <div className="skeleton" style={{ height: 360 }} />
      )}

      {assignmentId && location.isError && (
        <ErrorState
          error={location.error}
          onRetry={() => location.refetch()}
        />
      )}

      {assignmentId && location.data && (
        <OperationalMap result={location.data} mapsStatus={mapsStatus} />
      )}
    </div>
  );
}

/** Renderiza el mapa (o su alternativa) para un servicio asignado. */
function OperationalMap({
  result,
  mapsStatus,
}: {
  result: LastLocationResult;
  mapsStatus: MapsStatus;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { address, lastLocation, distanceMeters } = result;

  useEffect(() => {
    if (mapsStatus !== 'ready' || !mapRef.current || !address) return;
    const w = window as unknown as { google: any };
    const g = w.google;
    const home = { lat: address.latitude, lng: address.longitude };
    const map = new g.maps.Map(mapRef.current, {
      center: home,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    const bounds = new g.maps.LatLngBounds();
    new g.maps.Marker({
      position: home,
      map,
      title: `Domicilio · ${address.calle}`,
      label: 'D',
    });
    bounds.extend(home);

    if (lastLocation) {
      const provider = {
        lat: lastLocation.latitude,
        lng: lastLocation.longitude,
      };
      new g.maps.Marker({
        position: provider,
        map,
        title: 'Prestador',
        label: 'P',
      });
      bounds.extend(provider);
      new g.maps.Polyline({
        path: [home, provider],
        map,
        strokeColor: '#0369a1',
        strokeOpacity: 0.8,
        strokeWeight: 3,
      });
      map.fitBounds(bounds, 64);
    }
  }, [mapsStatus, address, lastLocation]);

  if (!address) {
    return (
      <div className="banner banner--warn">
        <Icon name="alert" size={16} className="banner__icon" />
        <span>
          El domicilio del servicio no tiene coordenadas cargadas. Completá la
          latitud y longitud del domicilio para ubicarlo en el mapa.
        </span>
      </div>
    );
  }

  return (
    <div className="stack gap-4">
      <div className="kpigrid">
        <InfoTile
          label="Distancia"
          value={formatDistance(distanceMeters)}
          icon="activity"
        />
        <InfoTile
          label="Domicilio"
          value={`${address.calle}, ${address.ciudad}`}
          icon="pin"
        />
        <InfoTile
          label="Última señal del prestador"
          value={
            lastLocation
              ? formatDateTime(lastLocation.timestampServer)
              : 'Sin reportes'
          }
          icon="clock"
        />
      </div>

      {!lastLocation && (
        <div className="banner banner--info">
          <Icon name="lock" size={16} className="banner__icon" />
          <span>
            Todavía no hay puntos de ubicación del prestador para este
            servicio. El tracking aparece desde la ventana previa al inicio.
          </span>
        </div>
      )}

      {mapsStatus === 'ready' && (
        <div className="card">
          <div className="map-canvas" ref={mapRef} />
        </div>
      )}

      {mapsStatus === 'loading' && (
        <div className="skeleton" style={{ height: 360 }} />
      )}

      {(mapsStatus === 'no-key' || mapsStatus === 'error') && (
        <MapFallback
          address={address}
          lastLocation={lastLocation}
          reason={mapsStatus}
        />
      )}
    </div>
  );
}

/** Alternativa sin mapa: detalle de coordenadas legible. */
function MapFallback({
  address,
  lastLocation,
  reason,
}: {
  address: AddressPoint;
  lastLocation: LastLocationPoint | null;
  reason: 'no-key' | 'error';
}) {
  return (
    <div className="card">
      <div className="card__body stack gap-3">
        <div className="banner banner--info">
          <Icon name="alert" size={16} className="banner__icon" />
          <span>
            {reason === 'no-key'
              ? 'No hay clave de Google Maps configurada (VITE_GOOGLE_MAPS_API_KEY). Se muestran las coordenadas como alternativa.'
              : 'No se pudo cargar Google Maps. Se muestran las coordenadas como alternativa.'}
          </span>
        </div>
        <dl className="kv">
          <dt>Domicilio</dt>
          <dd>
            {address.calle}, {address.ciudad}
          </dd>
          <dt>Coordenadas del domicilio</dt>
          <dd className="mono">
            {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
          </dd>
          <dt>Ubicación del prestador</dt>
          <dd className="mono">
            {lastLocation
              ? `${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}`
              : '—'}
          </dd>
          <dt>Conectividad</dt>
          <dd>
            {lastLocation ? (
              <StatusChip value={lastLocation.connectivityStatus} />
            ) : (
              '—'
            )}
          </dd>
        </dl>
      </div>
    </div>
  );
}

/** Tarjeta de dato del encabezado del mapa. */
function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: 'activity' | 'pin' | 'clock';
}) {
  return (
    <div className="kpi" style={{ cursor: 'default' }}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="kpi__value" style={{ fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}
