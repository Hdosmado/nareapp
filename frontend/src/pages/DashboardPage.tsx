import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import { AssignmentStatus, riskTone } from '../lib/enums';
import { Icon, type IconName } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { CardSkeleton, EmptyState, ErrorState } from '../components/states';

interface DashboardSummary {
  totalHoy: number;
  proximos: number;
  enRiesgo: number;
  demorados: number;
  ausenciaProbable: number;
  requierenReemplazo: number;
  enServicio: number;
  finalizados: number;
}

type Tone = 'blue' | 'verde' | 'amarillo' | 'naranja' | 'rojo';

interface KpiDef {
  key: keyof DashboardSummary;
  label: string;
  icon: IconName;
  tone: Tone;
  to: string;
  meta: string;
}

const KPIS: KpiDef[] = [
  {
    key: 'totalHoy',
    label: 'Servicios hoy',
    icon: 'calendar',
    tone: 'blue',
    to: '/agenda',
    meta: 'Ver agenda del día',
  },
  {
    key: 'proximos',
    label: 'Próximos',
    icon: 'clock',
    tone: 'blue',
    to: '/r/assignments?status=proximo',
    meta: 'Aún sin comenzar',
  },
  {
    key: 'enServicio',
    label: 'En servicio',
    icon: 'activity',
    tone: 'verde',
    to: '/r/assignments?status=en_servicio',
    meta: 'En curso ahora',
  },
  {
    key: 'finalizados',
    label: 'Finalizados',
    icon: 'check',
    tone: 'verde',
    to: '/r/assignments?status=finalizado',
    meta: 'Completados hoy',
  },
  {
    key: 'enRiesgo',
    label: 'En riesgo',
    icon: 'alert',
    tone: 'rojo',
    to: '/r/assignments?status=en_riesgo',
    meta: 'Requieren atención',
  },
  {
    key: 'demorados',
    label: 'Demorados',
    icon: 'clock',
    tone: 'naranja',
    to: '/r/assignments?status=demorado',
    meta: 'Fuera de horario',
  },
  {
    key: 'ausenciaProbable',
    label: 'Ausencia probable',
    icon: 'alert',
    tone: 'naranja',
    to: '/r/assignments?status=ausente_probable',
    meta: 'Sin confirmación',
  },
  {
    key: 'requierenReemplazo',
    label: 'Requieren reemplazo',
    icon: 'refresh',
    tone: 'rojo',
    to: '/r/assignments',
    meta: 'Gestionar cobertura',
  },
];

/** Franjas horarias para el filtro de la vista operativa. */
const HORARIOS = [
  { value: '', label: 'Cualquier horario' },
  { value: 'madrugada', label: 'Madrugada (00–06)' },
  { value: 'manana', label: 'Mañana (06–12)' },
  { value: 'tarde', label: 'Tarde (12–18)' },
  { value: 'noche', label: 'Noche (18–24)' },
] as const;

/** Indica si la hora de inicio del servicio cae en la franja elegida. */
function inHorario(value: unknown, horario: string): boolean {
  if (!horario) return true;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return false;
  const hour = date.getHours();
  if (horario === 'madrugada') return hour < 6;
  if (horario === 'manana') return hour >= 6 && hour < 12;
  if (horario === 'tarde') return hour >= 12 && hour < 18;
  return hour >= 18;
}

/** Ciudad de una fila de servicio asignado. */
function rowCity(row: Row): string {
  return String(getValue(row, 'city') ?? getValue(row, 'ciudad') ?? '');
}

/** Provincia de una fila de servicio asignado. */
function rowProvince(row: Row): string {
  return String(getValue(row, 'province') ?? getValue(row, 'provincia') ?? '');
}

/** Tablero operativo del día: indicadores accionables, agenda y alertas. */
export function DashboardPage() {
  const navigate = useNavigate();

  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [status, setStatus] = useState('');
  const [horario, setHorario] = useState('');

  const summary = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/coordination/dashboard'),
  });

  // Consulta base sin filtros: alimenta las opciones de ciudad y provincia.
  const todayBase = useQuery({
    queryKey: ['services-today', 'base'],
    queryFn: () => apiFetch<Row[]>('/coordination/services/today'),
  });

  // Consulta filtrada en el backend por ciudad, provincia y estado.
  const today = useQuery({
    queryKey: ['services-today', 'filtered', city, province, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (province) params.set('province', province);
      if (status) params.set('status', status);
      const qs = params.toString();
      return apiFetch<Row[]>(
        `/coordination/services/today${qs ? `?${qs}` : ''}`,
      );
    },
  });

  const alerts = useQuery({
    queryKey: ['alerts-active'],
    queryFn: () => apiFetch<Row[]>('/coordination/alerts?page=1&limit=8'),
  });

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of todayBase.data ?? []) {
      const value = rowCity(row);
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [todayBase.data]);

  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of todayBase.data ?? []) {
      const value = rowProvince(row);
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [todayBase.data]);

  // El backend ya filtra ciudad/provincia/estado; el horario se filtra acá.
  const rows = useMemo(() => {
    return (today.data ?? []).filter((row) =>
      inHorario(getValue(row, 'startTime'), horario),
    );
  }, [today.data, horario]);

  const hasFilters = Boolean(city || province || status || horario);

  function clearFilters() {
    setCity('');
    setProvince('');
    setStatus('');
    setHorario('');
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <div className="eyebrow">Resumen operativo</div>
          <h1 className="pagehead__title">Tablero operativo</h1>
          <p className="pagehead__desc">
            Estado de las asignaciones del día en la zona horaria de Argentina.
          </p>
        </div>
        <div className="pagehead__actions">
          <button
            className="btn"
            onClick={() => {
              void summary.refetch();
              void today.refetch();
              void todayBase.refetch();
              void alerts.refetch();
            }}
          >
            <Icon name="refresh" size={15} />
            Actualizar
          </button>
          <button
            className="btn btn--primary"
            onClick={() => navigate('/agenda')}
          >
            <Icon name="calendar" size={15} />
            Ver agenda
          </button>
        </div>
      </div>

      {summary.isLoading && <CardSkeleton count={8} />}
      {summary.isError && (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      )}
      {summary.data && (
        <div className="kpigrid">
          {KPIS.map((kpi, index) => {
            const value = summary.data[kpi.key] ?? 0;
            const accent = value > 0 && kpi.tone !== 'blue';
            return (
              <button
                key={kpi.key}
                className={`kpi tone-${kpi.tone}${accent ? ' kpi--accent' : ''}`}
                style={{ animationDelay: `${index * 45}ms` }}
                onClick={() => navigate(kpi.to)}
              >
                <div className="kpi__top">
                  <span className="kpi__label">{kpi.label}</span>
                  <span className="kpi__icon">
                    <Icon name={kpi.icon} size={16} />
                  </span>
                </div>
                <div className="kpi__value">{value}</div>
                <div className="kpi__meta">
                  {kpi.meta}
                  <Icon name="arrow-right" size={13} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="dash-grid">
        <section className="card">
          <div className="card__head">
            <div className="card__title">Servicios de hoy</div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/agenda')}
            >
              Ver agenda
              <Icon name="arrow-right" size={14} />
            </button>
          </div>

          <div className="dash-filters">
            <div className="dash-filters__field">
              <label htmlFor="filter-city">Ciudad</label>
              <select
                id="filter-city"
                className="field__control"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Todas</option>
                {cityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="dash-filters__field">
              <label htmlFor="filter-province">Provincia</label>
              <select
                id="filter-province"
                className="field__control"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                <option value="">Todas</option>
                {provinceOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="dash-filters__field">
              <label htmlFor="filter-horario">Horario</label>
              <select
                id="filter-horario"
                className="field__control"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              >
                {HORARIOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="dash-filters__field">
              <label htmlFor="filter-status">Estado</label>
              <select
                id="filter-status"
                className="field__control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {AssignmentStatus.map((opt) => (
                  <option key={opt} value={opt}>
                    {humanize(opt)}
                  </option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                className="btn btn--sm btn--ghost"
                onClick={clearFilters}
              >
                <Icon name="close" size={14} />
                Limpiar
              </button>
            )}
          </div>

          <div className="card__body card__body--flush">
            {today.isLoading && (
              <div style={{ padding: 24 }} className="skel-stack">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 44 }} />
                ))}
              </div>
            )}
            {today.isError && (
              <div style={{ padding: 24 }}>
                <ErrorState
                  error={today.error}
                  onRetry={() => today.refetch()}
                />
              </div>
            )}
            {today.data && rows.length === 0 && (
              <div style={{ padding: 16 }}>
                <EmptyState
                  icon="calendar"
                  title={
                    hasFilters
                      ? 'Ningún servicio coincide con el filtro'
                      : 'No hay servicios para hoy'
                  }
                  text={
                    hasFilters
                      ? 'Ajustá o limpiá los filtros para ver más servicios.'
                      : 'Cuando se programen servicios para la fecha actual aparecerán acá.'
                  }
                />
              </div>
            )}
            {today.data && rows.length > 0 && (
              <div className="tablescroll">
                <table>
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Inicio</th>
                      <th>Estado</th>
                      <th>Semáforo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={String(row.id ?? i)}
                        className="is-clickable"
                        onClick={() =>
                          navigate(`/servicio/${String(row.id)}`)
                        }
                      >
                        <td className="cell-strong">
                          {rowCity(row) || 'Servicio'}
                        </td>
                        <td className="cell-mono">
                          {formatDateTime(
                            getValue(row, 'startTime') ??
                              getValue(row, 'fecha'),
                          )}
                        </td>
                        <td>
                          <StatusChip
                            value={
                              getValue(row, 'status') ??
                              getValue(row, 'estado')
                            }
                          />
                        </td>
                        <td>
                          <Semaforo value={getValue(row, 'riskLevel')} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div className="card__title">Alertas activas</div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/r/alerts')}
            >
              Ver todas
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
          <div className="card__body">
            {alerts.isLoading && (
              <div className="skel-stack">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 52 }} />
                ))}
              </div>
            )}
            {alerts.isError && (
              <ErrorState
                error={alerts.error}
                onRetry={() => alerts.refetch()}
              />
            )}
            {alerts.data && alerts.data.length === 0 && (
              <EmptyState
                icon="check"
                title="Sin alertas activas"
                text="No hay alertas operativas pendientes en este momento."
              />
            )}
            {alerts.data && alerts.data.length > 0 && (
              <div className="stack gap-2">
                {alerts.data.map((alert, i) => (
                  <div key={String(alert.id ?? i)} className="relcard">
                    <div className="relcard__icon">
                      <Icon name="alert" size={17} />
                    </div>
                    <div className="relcard__meta grow">
                      <b>
                        {humanize(String(getValue(alert, 'type') ?? 'Alerta'))}
                      </b>
                      <span>
                        {formatDateTime(getValue(alert, 'createdAt'))}
                      </span>
                    </div>
                    <StatusChip value={getValue(alert, 'severity')} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Indicador de semáforo de riesgo. El nivel se muestra como texto además del
 * color, para que sea legible sin depender únicamente del color.
 */
function Semaforo({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="muted">—</span>;
  }
  const level = String(value).toLowerCase();
  const tone = riskTone(level);
  return (
    <span className={`semaforo semaforo--${tone}`} title={`Riesgo ${level}`}>
      <span className="semaforo__dot" aria-hidden="true" />
      {humanize(level)}
    </span>
  );
}
