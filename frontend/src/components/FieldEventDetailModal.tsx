/**
 * Detalle legible de un evento de campo (un latido de seguimiento o una
 * confirmación de LLEGUÉ / FIN). Traduce los datos crudos del tracking
 * (coordenadas, claves de idempotencia, banderas del dispositivo) a la lectura
 * que coordinación necesita: qué pasó, cuándo, y a qué distancia del domicilio.
 * Las coordenadas y los identificadores internos quedan en un bloque técnico
 * colapsable, no en primer plano.
 */
import { useEffect, useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import {
  describeProximity,
  formatDistance,
  haversineMeters,
  readPoint,
  type GeoPoint,
} from '../lib/geo';
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  dotIcon,
  homeIcon,
} from '../lib/leaflet';
import { Icon, type IconName } from './Icon';
import { Modal } from './Modal';
import { NEUTRAL_TONE, RISK_COLOR, type RiskLevel } from '../lib/risk';

/**
 * Tonos del semáforo desde la fuente única (`lib/risk`), más un tono neutro
 * para los puntos de seguimiento de rutina: ni acción (coral) ni estado de
 * riesgo, sólo un dato operativo en reposo. La contraparte cromática de
 * `.semaforo--neutral` / `.chip--neutral`.
 */
type ToneKey = RiskLevel | 'neutral';
const TONE_COLOR: Record<ToneKey, string> = {
  ...RISK_COLOR,
  neutral: NEUTRAL_TONE,
};

export type FieldEventKind = 'attendance' | 'location';

/** Una fila del resumen operativo: ícono, valor protagonista y su dimensión. */
interface SummaryRow {
  icon: IconName;
  value: string;
  label: string;
  tone?: keyof typeof TONE_COLOR;
}

/** Aviso destacado (excepción, ubicación simulada, latido sospechoso). */
interface Flag {
  tone: 'warn' | 'error';
  title: string;
  detail?: string;
}

interface EventModel {
  title: string;
  icon: IconName;
  chipText: string;
  chipTone: keyof typeof TONE_COLOR;
  whenLocal: unknown;
  whenServer: unknown;
  summary: SummaryRow[];
  flags: Flag[];
  point: GeoPoint | null;
  accuracy: number | null;
  distanceMeters: number | null;
}

/** Primer valor presente entre varias claves candidatas. */
function pick(obj: Row, keys: string[]): unknown {
  for (const key of keys) {
    const value = getValue(obj, key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

const CONNECTIVITY: Record<string, string> = {
  online: 'Con señal',
  offline: 'Sin señal (registrado sin conexión)',
  unknown: 'Conexión desconocida',
};

const PERMISSION: Record<string, string> = {
  siempre: 'Ubicación siempre activa',
  durante_uso: 'Ubicación solo con la app abierta',
  denegado: 'Permiso de ubicación denegado',
  desconocido: 'Permiso de ubicación desconocido',
};

const ORIGIN: Record<string, string> = {
  pre_servicio: 'Antes del servicio (en camino)',
  en_servicio: 'Durante el servicio',
  post_servicio: 'Después del servicio',
};

/** Lectura humana del tramo de tracking según el prefijo de `origin`. */
function describeOrigin(origin: string): string {
  for (const prefix of Object.keys(ORIGIN)) {
    if (origin.startsWith(prefix)) return ORIGIN[prefix];
  }
  return 'Seguimiento del prestador';
}

/** Distancia al domicilio: usa la precalculada o la deriva de las coordenadas. */
function resolveDistance(
  precomputed: unknown,
  home: GeoPoint | null,
  point: GeoPoint | null,
): number | null {
  if (typeof precomputed === 'number' && Number.isFinite(precomputed)) {
    return precomputed;
  }
  if (home && point) {
    return haversineMeters(
      home.latitude,
      home.longitude,
      point.latitude,
      point.longitude,
    );
  }
  return null;
}

/** Construye el modelo operativo de un evento de asistencia. */
function buildAttendance(ev: Row, home: GeoPoint | null): EventModel {
  const type = String(pick(ev, ['type']) ?? '');
  const isCheckIn = type === 'check_in';
  const point = readPoint(ev);
  const inside = pick(ev, ['insideAllowedRadius']);
  const distance = resolveDistance(pick(ev, ['distanceToAddress']), home, point);

  const summary: SummaryRow[] = [];
  if (inside === true || inside === false) {
    summary.push({
      icon: inside ? 'check' : 'alert',
      value: inside ? 'Dentro del radio permitido' : 'Fuera del radio permitido',
      label: 'Cobertura del domicilio',
      tone: inside ? 'verde' : 'naranja',
    });
  } else {
    summary.push({
      icon: 'pin',
      value: 'Sin radio de referencia',
      label: 'El domicilio no tiene ubicación cargada',
    });
  }
  if (distance !== null) {
    summary.push({
      icon: 'pin',
      value: describeProximity(distance),
      label: 'Distancia al domicilio',
    });
  }

  const flags: Flag[] = [];
  const exceptionReason = pick(ev, ['exceptionReason']);
  if (typeof exceptionReason === 'string' && exceptionReason.length > 0) {
    flags.push({
      tone: 'warn',
      title: 'El prestador registró una excepción',
      detail: exceptionReason,
    });
  }
  const earlyReason = pick(ev, ['earlyCheckoutReason']);
  if (typeof earlyReason === 'string' && earlyReason.length > 0) {
    flags.push({
      tone: 'warn',
      title: 'Finalización anticipada',
      detail: earlyReason,
    });
  }
  if (pick(ev, ['isMocked']) === true) {
    flags.push({
      tone: 'error',
      title: 'Ubicación simulada',
      detail:
        'La app reportó una ubicación falsa (mock). El servidor no la toma como presencia válida.',
    });
  }

  const mocked = pick(ev, ['isMocked']) === true;
  const accuracy = pick(ev, ['accuracy']);
  return {
    title: isCheckIn ? 'Llegada registrada' : 'Fin de servicio',
    icon: isCheckIn ? 'check' : 'clock',
    chipText: isCheckIn ? 'Llegó' : 'Finalizó',
    chipTone: mocked ? 'rojo' : inside === false ? 'naranja' : 'verde',
    whenLocal: pick(ev, ['timestampLocal']),
    whenServer: pick(ev, ['timestampServer', 'createdAt']),
    summary,
    flags,
    point,
    accuracy: typeof accuracy === 'number' ? accuracy : null,
    distanceMeters: distance,
  };
}

/** Construye el modelo operativo de un punto de seguimiento. */
function buildLocation(ev: Row, home: GeoPoint | null): EventModel {
  const point = readPoint(ev);
  const distance = resolveDistance(undefined, home, point);
  const geofence = pick(ev, ['insideGeofence']);
  const connectivity = String(pick(ev, ['connectivityStatus']) ?? 'unknown');
  const battery = pick(ev, ['batteryLevel']);
  const permission = pick(ev, ['locationPermission']);
  const origin = String(pick(ev, ['origin']) ?? '');

  const summary: SummaryRow[] = [];
  if (origin) {
    summary.push({
      icon: 'activity',
      value: describeOrigin(origin),
      label: 'Tramo del seguimiento',
    });
  }
  if (geofence === true || geofence === false) {
    summary.push({
      icon: geofence ? 'check' : 'alert',
      value: geofence ? 'Dentro del radio del domicilio' : 'Fuera del radio del domicilio',
      label: 'Cobertura del domicilio',
      tone: geofence ? 'verde' : 'naranja',
    });
  }
  if (distance !== null) {
    summary.push({
      icon: 'pin',
      value: describeProximity(distance),
      label: 'Distancia al domicilio',
    });
  }
  summary.push({
    icon: 'activity',
    value: CONNECTIVITY[connectivity] ?? 'Conexión desconocida',
    label: 'Conexión del equipo',
    tone: connectivity === 'offline' ? 'amarillo' : undefined,
  });
  if (typeof battery === 'number') {
    summary.push({
      icon: 'settings',
      value: `${battery}%`,
      label: 'Batería del equipo',
      tone: battery <= 15 ? 'naranja' : undefined,
    });
  }
  if (typeof permission === 'string' && permission && permission !== 'siempre') {
    summary.push({
      icon: 'lock',
      value: PERMISSION[permission] ?? humanize(permission),
      label: 'Permiso de ubicación',
      tone: permission === 'denegado' ? 'naranja' : 'amarillo',
    });
  }

  const flags: Flag[] = [];
  if (pick(ev, ['suspicious']) === true) {
    const reason = pick(ev, ['suspiciousReason']);
    flags.push({
      tone: 'error',
      title: 'Latido marcado como sospechoso',
      detail:
        typeof reason === 'string' && reason
          ? `Motivo: ${humanize(reason)}.`
          : 'El servidor detectó una señal anti-fraude en este punto.',
    });
  }
  if (pick(ev, ['isMocked']) === true) {
    flags.push({
      tone: 'error',
      title: 'Ubicación simulada',
      detail: 'La app reportó una ubicación falsa (mock).',
    });
  }

  const suspicious =
    pick(ev, ['suspicious']) === true || pick(ev, ['isMocked']) === true;
  return {
    title: 'Punto de seguimiento',
    icon: 'pin',
    chipText: 'Seguimiento',
    chipTone: suspicious ? 'rojo' : geofence === false ? 'naranja' : 'neutral',
    whenLocal: pick(ev, ['timestampLocal']),
    whenServer: pick(ev, ['timestampServer', 'createdAt']),
    summary,
    flags,
    point,
    accuracy:
      typeof pick(ev, ['accuracy']) === 'number'
        ? (pick(ev, ['accuracy']) as number)
        : null,
    distanceMeters: distance,
  };
}

export function FieldEventDetailModal({
  event,
  kind,
  address,
  onClose,
}: {
  event: Row;
  kind: FieldEventKind;
  address: Row | null;
  onClose: () => void;
}) {
  const home = readPoint(address);

  const model = useMemo<EventModel>(
    () =>
      kind === 'attendance'
        ? buildAttendance(event, home)
        : buildLocation(event, home),
    [event, kind, home],
  );

  const homeLabel = address
    ? [pick(address, ['calle']), pick(address, ['ciudad'])]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <Modal
      onClose={onClose}
      className="modal--wide"
      labelledBy="fieldevent-title"
    >
          <div className="modal__head">
            <div className="row gap-3" style={{ alignItems: 'center' }}>
              <div className="relcard__icon" aria-hidden="true">
                <Icon name={model.icon} size={18} />
              </div>
              <div>
                <div className="modal__title" id="fieldevent-title">
                  {model.title}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="iconbtn"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className="modal__body stack gap-4">
            <div className="evlead">
              <div className="evlead__when">
                <span className="evlead__time">
                  {formatDateTime(model.whenLocal ?? model.whenServer)}
                </span>
                <span className="evlead__caption">
                  {model.whenLocal
                    ? 'Hora del prestador'
                    : 'Hora registrada en el servidor'}
                </span>
              </div>
              <span className={`chip chip--${model.chipTone}`}>
                {model.chipText}
              </span>
            </div>

            {model.flags.map((flag, i) => (
              <div
                key={i}
                className={`banner banner--${flag.tone}`}
                role={flag.tone === 'error' ? 'alert' : undefined}
              >
                <Icon name="alert" size={16} className="banner__icon" />
                <div className="stack gap-1">
                  <b>{flag.title}</b>
                  {flag.detail && <span>{flag.detail}</span>}
                </div>
              </div>
            ))}

            <div className="evrows">
              {model.summary.map((rowItem, i) => (
                <div className="evrow" key={i}>
                  <span
                    className="evrow__icon"
                    style={
                      rowItem.tone
                        ? {
                            color: TONE_COLOR[rowItem.tone],
                            background: `${TONE_COLOR[rowItem.tone]}1a`,
                          }
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    <Icon name={rowItem.icon} size={16} />
                  </span>
                  <div className="evrow__meta">
                    <b
                      style={
                        rowItem.tone
                          ? { color: TONE_COLOR[rowItem.tone] }
                          : undefined
                      }
                    >
                      {rowItem.value}
                    </b>
                    <span>{rowItem.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {model.point ? (
              <div className="evmap">
                <EventMiniMap
                  home={home}
                  homeLabel={homeLabel}
                  point={model.point}
                  accuracy={model.accuracy}
                  color={TONE_COLOR[model.chipTone]}
                  title={model.title}
                />
                <div className="evmap__caption">
                  <Icon name="pin" size={13} />
                  {model.distanceMeters !== null && home
                    ? `Punto del prestador a ${formatDistance(
                        model.distanceMeters,
                      )} del domicilio`
                    : 'Ubicación del prestador en el momento del evento'}
                </div>
              </div>
            ) : (
              <div className="row gap-2 muted" style={{ fontSize: 13 }}>
                <Icon name="pin" size={15} />
                Este evento no registró ubicación.
              </div>
            )}

            <TechnicalBlock event={event} kind={kind} />
          </div>

          <div className="modal__foot">
            <button
              type="button"
              className="btn btn--primary"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
    </Modal>
  );
}

/** Mini-mapa: domicilio, punto del evento, su precisión y la recta entre ambos. */
function EventMiniMap({
  home,
  homeLabel,
  point,
  accuracy,
  color,
  title,
}: {
  home: GeoPoint | null;
  homeLabel: string;
  point: GeoPoint;
  accuracy: number | null;
  color: string;
  title: string;
}) {
  return (
    <MapContainer
      center={[point.latitude, point.longitude]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: 260, width: '100%' }}
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      <FitBounds home={home} point={point} />
      {home && (
        <>
          <Marker position={[home.latitude, home.longitude]} icon={homeIcon()}>
            <Popup>
              <strong>Domicilio</strong>
              {homeLabel && <div className="muted">{homeLabel}</div>}
            </Popup>
          </Marker>
          <Polyline
            positions={[
              [home.latitude, home.longitude],
              [point.latitude, point.longitude],
            ]}
            pathOptions={{
              // Taupe cálido (tono neutro de la paleta, espejo de --ink-faint),
              // no slate frío: la línea entre domicilio y punto GPS queda dentro
              // de la paleta del panel.
              color: NEUTRAL_TONE,
              weight: 2,
              dashArray: '4 6',
              opacity: 0.8,
            }}
          />
        </>
      )}
      {accuracy && accuracy > 0 && (
        <Circle
          center={[point.latitude, point.longitude]}
          radius={accuracy}
          pathOptions={{ color, weight: 1, fillOpacity: 0.1, opacity: 0.4 }}
        />
      )}
      <Marker
        position={[point.latitude, point.longitude]}
        icon={dotIcon(color)}
      >
        <Popup>
          <strong>{title}</strong>
          {accuracy && accuracy > 0 && (
            <div className="muted">Precisión del GPS: ±{Math.round(accuracy)} m</div>
          )}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

/** Encuadra el mapa para que entren el domicilio y el punto del evento. */
function FitBounds({
  home,
  point,
}: {
  home: GeoPoint | null;
  point: GeoPoint;
}) {
  const map = useMap();
  useEffect(() => {
    // El modal entra con una animación de escala; Leaflet puede medir mal el
    // contenedor al montar y dejar los tiles cortados. Recalcular el tamaño
    // tras el primer frame lo corrige.
    const t = setTimeout(() => map.invalidateSize(), 60);
    if (home) {
      const bounds = new LatLngBounds([
        [home.latitude, home.longitude],
        [point.latitude, point.longitude],
      ]);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    } else {
      map.setView([point.latitude, point.longitude], 15);
    }
    return () => clearTimeout(t);
  }, [home, point, map]);
  return null;
}

/** Datos técnicos crudos del evento, colapsados por defecto (para auditoría). */
function TechnicalBlock({
  event,
  kind,
}: {
  event: Row;
  kind: FieldEventKind;
}) {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: String(value) });
  };

  const lat = pick(event, ['latitude']);
  const lon = pick(event, ['longitude']);
  if (typeof lat === 'number' && typeof lon === 'number') {
    push('Coordenadas', `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
  }
  push('Precisión del GPS', typeof pick(event, ['accuracy']) === 'number'
    ? `±${Math.round(pick(event, ['accuracy']) as number)} m`
    : undefined);
  if (kind === 'location') {
    push('Origen', pick(event, ['origin']));
  }
  push('Hora del prestador', formatDateTimeOrSkip(pick(event, ['timestampLocal'])));
  push('Hora del servidor', formatDateTimeOrSkip(pick(event, ['timestampServer'])));
  push('Clave de idempotencia', pick(event, ['idempotencyKey']));
  push('Identificador', pick(event, ['id']));

  if (rows.length === 0) return null;

  return (
    <details className="evtech">
      <summary>
        <Icon name="chevron-down" size={15} className="evtech__chev" />
        Detalle técnico
      </summary>
      <dl className="kv evtech__body">
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'contents' }}>
            <dt>{r.label}</dt>
            <dd className="mono">{r.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Formatea una fecha sólo si existe; si no, devuelve undefined (no se muestra). */
function formatDateTimeOrSkip(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return formatDateTime(value);
}
