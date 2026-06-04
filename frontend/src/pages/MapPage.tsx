import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { divIcon, LatLngBounds } from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
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
import {
  NEUTRAL_TONE,
  RISK_COLOR,
  normalizeRiskLevel,
  type RiskLevel,
} from '../lib/risk';

/** Punto geográfico genérico. */
interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface AddressPoint extends GeoPoint {
  calle: string;
  ciudad: string;
  provincia: string;
  /** Radio de geocerca del domicilio (m): tolerancia de llegada. */
  allowedRadiusM: number;
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
  /** ¿El último punto cae dentro de la geocerca? null si no es computable. */
  insideGeofence: boolean | null;
  /** Minutos continuos fuera de la geocerca; null si está dentro o no computable. */
  minutesOutsideGeofence: number | null;
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
  return normalizeRiskLevel(getValue(row, 'riskLevel'));
}

/**
 * Geocerca del domicilio: el radio de tolerancia de llegada del prestador,
 * en taupe neutro para no competir con el color de riesgo de los markers. Su
 * utilidad es de un vistazo: ver si el punto del prestador cae dentro o fuera.
 */
const GEOFENCE_STYLE = {
  color: NEUTRAL_TONE,
  weight: 1.5,
  opacity: 0.55,
  fillColor: NEUTRAL_TONE,
  fillOpacity: 0.06,
  dashArray: '4 5',
} as const;

/** Identidad del par: apellido del prestador y «Inicial. Apellido» de la persona. */
function identityLabel(row: Row): { provider: string; patient: string } {
  const provApellido = String(getValue(row, 'provider.apellido') ?? '').trim();
  const patApellido = String(getValue(row, 'patient.apellido') ?? '').trim();
  const patNombre = String(getValue(row, 'patient.nombre') ?? '').trim();
  const patient = patApellido
    ? patNombre
      ? `${patNombre[0].toUpperCase()}. ${patApellido}`
      : patApellido
    : '';
  return { provider: provApellido || 'Prestador', patient };
}

/** "Un buen rato" fuera de la geocerca: a partir de estos minutos, rojo. */
const OUTSIDE_ALERT_MIN = 15;

/** Estados donde ya se espera al prestador en el domicilio (estar fuera pesa). */
const ARRIVAL_EXPECTED = new Set([
  'llego',
  'en_servicio',
  'demorado',
  'ausente',
  'ausente_probable',
]);

/**
 * Señal de proximidad del prestador respecto de la geocerca del domicilio,
 * graduada por cuánto lleva fuera. Reusa el semáforo, pero acá significa
 * "¿está donde debería?":
 *  - verde:    dentro de la geocerca.
 *  - amarillo: fuera, pero la llegada todavía no se espera (en aproximación).
 *  - naranja:  fuera con llegada ya esperada, hace poco.
 *  - rojo:     fuera con llegada esperada hace un buen rato (problema sostenido).
 * Devuelve null si la geocerca no es computable: el marker cae al riskLevel.
 */
function proximitySignal(
  row: Row,
  loc: LastLocationResult,
): { level: RiskLevel; text: string } | null {
  // `== null` (no `===`) a propósito: un backend viejo manda el campo como
  // `undefined`; así no inventamos una señal de proximidad sin dato real.
  if (loc.insideGeofence == null) return null;
  if (loc.insideGeofence) return { level: 'verde', text: 'En el domicilio' };

  const mins = loc.minutesOutsideGeofence ?? 0;
  const status = String(getValue(row, 'status') ?? '');
  const startTime = getValue(row, 'startTime');
  const start = startTime ? new Date(String(startTime)).getTime() : NaN;
  const arrivalExpected =
    ARRIVAL_EXPECTED.has(status) ||
    (!Number.isNaN(start) && Date.now() >= start);

  if (!arrivalExpected) return { level: 'amarillo', text: 'En aproximación' };
  const text = mins > 0 ? `Fuera de zona hace ${mins} min` : 'Fuera de zona';
  return { level: mins >= OUTSIDE_ALERT_MIN ? 'rojo' : 'naranja', text };
}

/**
 * Etiqueta de identidad anclada a un marker (tooltip de Leaflet reestilado).
 * `permanent` la deja fija (modo "Nombres" activo); si no, aparece al pasar el
 * puntero, para identificar sin saturar cuando hay muchos markers.
 */
function IdentityLabel({
  level,
  provider,
  patient,
  permanent,
}: {
  level: RiskLevel;
  provider: string;
  patient: string;
  permanent: boolean;
}) {
  return (
    <Tooltip
      // `permanent` se fija al crear el tooltip en Leaflet; remontamos con key
      // para que alternar fijo/hover (toggle "Nombres") tome efecto en caliente.
      key={permanent ? 'fijo' : 'hover'}
      permanent={permanent}
      direction="right"
      offset={[11, 0]}
      opacity={1}
      className="maplabel"
    >
      <span
        className="maplabel__dot"
        style={{ background: RISK_COLOR[level] }}
        aria-hidden="true"
      />
      <span className="maplabel__name">{provider}</span>
      {patient && <span className="maplabel__to">→ {patient}</span>}
    </Tooltip>
  );
}

/**
 * Etiqueta de ancla del domicilio: marca de rombo + apellido del prestador que
 * lo cubre. Estilo tenue para no competir con la etiqueta viva del prestador;
 * su función es identificar de quién es cada domicilio de un vistazo.
 */
function HomeLabel({
  provider,
  permanent,
}: {
  provider: string;
  permanent: boolean;
}) {
  return (
    <Tooltip
      key={permanent ? 'fijo' : 'hover'}
      permanent={permanent}
      direction="right"
      offset={[10, 0]}
      opacity={1}
      className="maplabel maplabel--home"
    >
      <span className="maplabel__home" aria-hidden="true" />
      <span className="maplabel__name">{provider}</span>
    </Tooltip>
  );
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
  // Nombres fijos sobre los markers: encendidos por defecto (es el sentido del
  // mapa, distinguir a varios de un vistazo). Apagarlos deja las etiquetas en
  // modo hover, para descongestionar cuando hay muchos puntos juntos.
  const [showLabels, setShowLabels] = useState(true);

  return (
    <div className="stack gap-4">
      <div
        className="row gap-2 wrap"
        style={{ fontSize: 13, color: 'var(--ink-soft)' }}
      >
        <Icon name="activity" size={14} />
        <span>
          {points.length} de {totalTracked} servicios en tracking con datos
          cargados · {withProvider.length} con ubicación del prestador
        </span>
        <button
          className={`chipfilter${showLabels ? ' is-active' : ''}`}
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowLabels((v) => !v)}
          aria-pressed={showLabels}
          title={
            showLabels
              ? 'Ocultar nombres (quedan al pasar el puntero)'
              : 'Mostrar nombres sobre los markers'
          }
        >
          <Icon name="users" size={13} />
          Nombres
        </button>
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
              showLabels={showLabels}
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

  // Firma estable de las coordenadas: `coords` cambia de identidad en cada
  // render (los resultados de useQueries se recrean), pero esta cadena sólo
  // cambia cuando una coordenada cambia de verdad. Así el reencuadre no se
  // dispara en cada render ni pelea con el pan/zoom manual del usuario.
  const coordsKey = useMemo(
    () => coords.map((c) => `${c[0]},${c[1]}`).join('|'),
    [coords],
  );

  // El reencuadre es un efecto imperativo sobre el mapa, no un cálculo puro:
  // va en useEffect (no en useMemo, que React puede recalcular o descartar a
  // discreción y que se ejecutaría dos veces bajo StrictMode).
  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 14);
      return;
    }
    map.fitBounds(new LatLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
    // Depende de la firma estable, no del array `coords`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey, map]);

  return null;
}

/** Markers de un servicio individual: domicilio + geocerca + (opcional) prestador. */
function ServiceMarkers({
  row,
  loc,
  risk,
  showLabels,
}: {
  row: Row;
  loc: LastLocationResult;
  risk: RiskLevel;
  showLabels: boolean;
}) {
  const providerName = [
    getValue(row, 'provider.apellido'),
    getValue(row, 'provider.nombre'),
  ]
    .filter(Boolean)
    .join(', ');
  const startTime = getValue(row, 'startTime');
  const status = String(getValue(row, 'status') ?? '');
  const identity = identityLabel(row);
  const proximity = proximitySignal(row, loc);
  // Color del marker del prestador: la señal de proximidad a la geocerca manda;
  // si no es computable (domicilio sin coordenadas), cae al riskLevel del motor.
  const markerLevel = proximity?.level ?? risk;

  return (
    <>
      {loc.address && (
        <>
          {/* Geocerca: radio de llegada del domicilio (referencia espacial).
              Sólo si el radio es válido: tolera un backend viejo que todavía no
              envía `allowedRadiusM` (no dibuja un círculo roto). */}
          {loc.address.allowedRadiusM > 0 && (
            <Circle
              center={[loc.address.latitude, loc.address.longitude]}
              radius={loc.address.allowedRadiusM}
              pathOptions={GEOFENCE_STYLE}
            />
          )}
          <Marker
            position={[loc.address.latitude, loc.address.longitude]}
            icon={homeIcon()}
          >
            {/* El domicilio dice quién lo cubre: el prestador asignado. */}
            <HomeLabel provider={identity.provider} permanent={showLabels} />
            <Popup>
              <strong>Domicilio</strong>
              <div>{loc.address.calle}</div>
              <div className="muted">
                {loc.address.ciudad}, {loc.address.provincia}
              </div>
              <div className="muted">Prestador: {providerName || '—'}</div>
              <div className="muted">
                Radio de llegada: {loc.address.allowedRadiusM} m
              </div>
            </Popup>
          </Marker>
        </>
      )}
      {loc.lastLocation && (
        <Marker
          position={[loc.lastLocation.latitude, loc.lastLocation.longitude]}
          icon={markerIcon(markerLevel)}
        >
          {/* La identidad cuelga del prestador: es el punto que importa seguir.
              El punto de color = señal de proximidad (misma del marker). */}
          <IdentityLabel
            level={markerLevel}
            provider={identity.provider}
            patient={identity.patient}
            permanent={showLabels}
          />
          <Popup>
            <strong>{providerName || 'Prestador'}</strong>
            {proximity && (
              <div className="map-signal">
                <span
                  className="map-signal__dot"
                  style={{ background: RISK_COLOR[proximity.level] }}
                  aria-hidden="true"
                />
                {proximity.text}
              </div>
            )}
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
