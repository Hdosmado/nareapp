import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { divIcon, LatLngBounds } from 'leaflet';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../lib/api';
import {
  ARGENTINA_CENTER,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  homeIcon,
} from '../lib/leaflet';
import {
  formatDateTime,
  getValue,
  humanize,
  type Row,
} from '../lib/format';
import { Icon } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { EmptyState, ErrorState } from '../components/states';

/** Punto geográfico genérico. */
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

/** Refresca el mapa cada 30s. Los datos se recargan vía React Query. */
const REFETCH_MS = 30_000;

/** Estados de asignación que consideramos "en ventana de tracking". */
const TRACKING_STATES = new Set([
  'proximo',
  'en_riesgo',
  'en_camino',
  'demorado',
  'llego',
  'en_servicio',
]);

type RiskLevel = 'verde' | 'amarillo' | 'naranja' | 'rojo';

const RISK_COLOR: Record<RiskLevel, string> = {
  verde: '#15803d',
  amarillo: '#ca8a04',
  naranja: '#ea580c',
  rojo: '#dc2626',
};

/**
 * Mapa operativo del panel.
 *
 * Muestra todos los servicios de hoy con prestador asignado en ventana de
 * tracking. Cada asignación se renderiza como dos puntos vinculados:
 * domicilio (siempre que tenga coordenadas) y última ubicación conocida
 * del prestador. El color del marker viene dado por `riskLevel`.
 *
 * Datos provistos por `GET /coordination/services/today` y, en paralelo,
 * `GET /coordination/services/:id/last-location` por servicio. Auto-refresh
 * cada 30 segundos vía React Query.
 */
export function MapPage() {
  const today = useQuery({
    queryKey: ['map-services-today'],
    queryFn: () => apiFetch<Row[]>('/coordination/services/today'),
    refetchInterval: REFETCH_MS,
  });

  /** Asignaciones con prestador en ventana de tracking. */
  const tracked = useMemo(() => {
    const rows = today.data ?? [];
    return rows.filter((row) => {
      const status = String(getValue(row, 'status') ?? '');
      const providerId = getValue(row, 'provider.id');
      return TRACKING_STATES.has(status) && Boolean(providerId);
    });
  }, [today.data]);

  /** Carga las últimas ubicaciones para cada asignación trackeada. */
  const locationQueries = useQueries({
    queries: tracked.map((row) => ({
      queryKey: ['service-last-location', row.id],
      queryFn: () =>
        apiFetch<LastLocationResult>(
          `/coordination/services/${row.id}/last-location`,
        ),
      refetchInterval: REFETCH_MS,
      staleTime: REFETCH_MS / 2,
    })),
  });

  /** Combina cada asignación con su ubicación cargada (cuando ya llegó). */
  const points = useMemo(() => {
    return tracked
      .map((row, idx) => {
        const loc = locationQueries[idx]?.data ?? null;
        return loc ? { row, loc } : null;
      })
      .filter((x): x is { row: Row; loc: LastLocationResult } => x !== null);
  }, [tracked, locationQueries]);

  const refreshAll = () => {
    void today.refetch();
    locationQueries.forEach((q) => void q.refetch());
  };

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">Operación</div>
          <h1 className="pagehead__title">Mapa operativo</h1>
          <p className="pagehead__desc">
            Última ubicación conocida de los prestadores con servicio en
            ventana de tracking. Se actualiza cada 30&nbsp;segundos.
          </p>
        </div>
        <div className="pagehead__actions">
          <button className="btn" onClick={refreshAll}>
            <Icon name="refresh" size={15} />
            Actualizar
          </button>
        </div>
      </div>

      {today.isLoading && <div className="skeleton" style={{ height: 360 }} />}
      {today.isError && (
        <ErrorState error={today.error} onRetry={() => today.refetch()} />
      )}

      {today.data && tracked.length === 0 && (
        <EmptyState
          icon="pin"
          title="No hay prestadores en ventana de tracking"
          text="Cuando un prestador entre en la ventana previa al servicio o esté en curso, va a aparecer acá."
        />
      )}

      {tracked.length > 0 && (
        <OperationalMap points={points} totalTracked={tracked.length} />
      )}
    </div>
  );
}

/** Marker coloreado por riskLevel en formato `divIcon` (sin sprites externos). */
function markerIcon(risk: RiskLevel) {
  const color = RISK_COLOR[risk];
  const html = `<span style="
    display: inline-block;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${color};
    border: 3px solid #fff;
    box-shadow: 0 0 0 2px ${color}66, 0 1px 4px rgba(0,0,0,0.35);
  "></span>`;
  return divIcon({
    html,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

/** Lee y normaliza el riskLevel de una fila. */
function rowRiskLevel(row: Row): RiskLevel {
  const raw = String(getValue(row, 'riskLevel') ?? 'verde').toLowerCase();
  if (raw === 'amarillo' || raw === 'naranja' || raw === 'rojo') return raw;
  return 'verde';
}

/** Renderiza el mapa con los markers y la lista lateral. */
function OperationalMap({
  points,
  totalTracked,
}: {
  points: { row: Row; loc: LastLocationResult }[];
  totalTracked: number;
}) {
  const withProvider = points.filter((p) => p.loc.lastLocation !== null);
  const withoutProvider = points.filter((p) => p.loc.lastLocation === null);

  return (
    <div className="stack gap-4">
      <div className="row gap-2 muted" style={{ fontSize: 13 }}>
        <Icon name="activity" size={14} />
        <span>
          {points.length} de {totalTracked} servicios en tracking con datos
          cargados · {withProvider.length} con ubicación del prestador
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <MapContainer
          center={ARGENTINA_CENTER}
          zoom={5}
          scrollWheelZoom
          style={{ height: 480, width: '100%' }}
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <FitBoundsToPoints points={points} />
          {points.map(({ row, loc }) => (
            <ServiceMarkers
              key={String(row.id)}
              row={row}
              loc={loc}
              risk={rowRiskLevel(row)}
            />
          ))}
        </MapContainer>
      </div>

      {withoutProvider.length > 0 && (
        <div className="banner banner--info">
          <Icon name="lock" size={16} className="banner__icon" />
          <span>
            {withoutProvider.length} servicio(s) en tracking todavía no
            reportaron ubicación del prestador. El tracking aparece desde
            la ventana previa al inicio.
          </span>
        </div>
      )}
    </div>
  );
}

/** Encuadra el mapa para que entren todos los markers visibles. */
function FitBoundsToPoints({
  points,
}: {
  points: { row: Row; loc: LastLocationResult }[];
}) {
  const map = useMap();
  const coords = useMemo(() => {
    const result: [number, number][] = [];
    for (const { loc } of points) {
      if (loc.address) result.push([loc.address.latitude, loc.address.longitude]);
      if (loc.lastLocation) {
        result.push([loc.lastLocation.latitude, loc.lastLocation.longitude]);
      }
    }
    return result;
  }, [points]);

  useMemo(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 14);
      return;
    }
    const bounds = new LatLngBounds(coords);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [coords, map]);

  return null;
}

/** Markers de un servicio individual: domicilio + (opcional) prestador. */
function ServiceMarkers({
  row,
  loc,
  risk,
}: {
  row: Row;
  loc: LastLocationResult;
  risk: RiskLevel;
}) {
  const providerName = [
    getValue(row, 'provider.apellido'),
    getValue(row, 'provider.nombre'),
  ]
    .filter(Boolean)
    .join(', ');
  const startTime = getValue(row, 'startTime');
  const status = String(getValue(row, 'status') ?? '');

  return (
    <>
      {loc.address && (
        <Marker
          position={[loc.address.latitude, loc.address.longitude]}
          icon={homeIcon()}
        >
          <Popup>
            <strong>Domicilio</strong>
            <div>{loc.address.calle}</div>
            <div className="muted">
              {loc.address.ciudad}, {loc.address.provincia}
            </div>
          </Popup>
        </Marker>
      )}
      {loc.lastLocation && (
        <Marker
          position={[loc.lastLocation.latitude, loc.lastLocation.longitude]}
          icon={markerIcon(risk)}
        >
          <Popup>
            <strong>{providerName || 'Prestador'}</strong>
            <div className="muted">{humanize(status)}</div>
            <div className="muted">Inicio: {formatDateTime(startTime)}</div>
            <div className="muted">
              Última señal: {formatDateTime(loc.lastLocation.timestampServer)}
            </div>
            <div className="muted">
              Conectividad: <StatusChip value={loc.lastLocation.connectivityStatus} />
            </div>
            {loc.distanceMeters !== null && (
              <div className="muted">
                A {formatDistance(loc.distanceMeters)} del domicilio
              </div>
            )}
          </Popup>
        </Marker>
      )}
    </>
  );
}

/** Distancia formateada en metros o kilómetros. */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
