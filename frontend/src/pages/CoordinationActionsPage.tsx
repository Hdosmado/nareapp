import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import {
  dayKey,
  dayLabel,
  formatDateShort,
  formatTime,
  formatTimeRange,
  type Row,
} from '../lib/format';
import { actionLabel, actionTone, ACTION_TYPES } from '../lib/coordinationActions';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState } from '../components/states';

/** Vista normalizada de una acción de coordinación para la bitácora. */
interface ActionView {
  id: string;
  type: string;
  label: string;
  tone: string;
  createdAt: unknown;
  coordinator: string | null;
  assignmentId: string;
  provider: string | null;
  previousProvider: string | null;
  patient: string | null;
  startTime: unknown;
  endTime: unknown;
  notes: string;
}

/** Un grupo de acciones de un mismo día calendario. */
interface DayGroup {
  key: string;
  label: string;
  items: ActionView[];
}

/** Nombre «Apellido Nombre» a partir de un objeto con esas claves. */
function fullName(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  const row = obj as Row;
  return `${String(row.apellido ?? '')} ${String(row.nombre ?? '')}`.trim();
}

/** Normaliza la fila cruda del backend a la vista de la bitácora. */
function toView(row: Row): ActionView {
  const assignment = (row.assignment ?? {}) as Row;
  const coordinator = (row.coordinator ?? {}) as Row;
  const providerRow = assignment.provider as Row | undefined;
  const original = (assignment.originalAssignment ?? {}) as Row;
  const prevProviderRow = original.provider as Row | undefined;
  const patientRow = assignment.patient as Row | undefined;
  const type = String(row.actionType ?? '');
  return {
    id: String(row.id ?? ''),
    type,
    label: actionLabel(type),
    tone: actionTone(type),
    createdAt: row.createdAt,
    coordinator: String(coordinator.nombre ?? '').trim() || null,
    assignmentId: String(assignment.id ?? ''),
    provider: fullName(providerRow) || null,
    previousProvider: fullName(prevProviderRow) || null,
    patient: fullName(patientRow) || null,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    notes: String(row.notes ?? '').trim(),
  };
}

/** Bitácora de acciones de coordinación: registro cronológico de rendición de cuentas. */
export function CoordinationActionsPage() {
  const [coordinator, setCoordinator] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } =
    useQuery({
      queryKey: ['coordination-actions'],
      queryFn: () =>
        apiFetch<Row[]>('/coordination/actions?limit=100'),
      refetchInterval: 60_000,
    });

  const views = useMemo(() => (data ?? []).map(toView), [data]);

  // Coordinadores presentes en la página cargada, para el filtro.
  const coordinators = useMemo(() => {
    const set = new Set<string>();
    views.forEach((v) => v.coordinator && set.add(v.coordinator));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [views]);

  // Tipos de acción que efectivamente aparecen, para no ofrecer filtros vacíos.
  const presentTypes = useMemo(() => {
    const set = new Set(views.map((v) => v.type));
    return ACTION_TYPES.filter((t) => set.has(t));
  }, [views]);

  const hasFilter = Boolean(coordinator || type || search.trim());

  // Filtrado sobre la página cargada (consistente con la búsqueda del panel).
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return views.filter((v) => {
      if (coordinator && v.coordinator !== coordinator) return false;
      if (type && v.type !== type) return false;
      if (term) {
        const haystack = [
          v.label,
          v.coordinator ?? '',
          v.provider ?? '',
          v.previousProvider ?? '',
          v.patient ?? '',
          v.notes,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [views, coordinator, type, search]);

  // Agrupación por día calendario, preservando el orden descendente del backend.
  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const v of filtered) {
      const key = dayKey(v.createdAt) || 'sin-fecha';
      let group = map.get(key);
      if (!group) {
        group = { key, label: dayLabel(v.createdAt), items: [] };
        map.set(key, group);
      }
      group.items.push(v);
    }
    return Array.from(map.values());
  }, [filtered]);

  function clearFilters() {
    setCoordinator('');
    setType('');
    setSearch('');
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">Acciones de coordinación</h1>
          <p className="pagehead__desc">
            Quién hizo qué sobre cada servicio. El registro de las decisiones de
            coordinación, con su responsable, el prestador y la persona a cuidar
            involucrados, y el acceso a la ficha del servicio.
          </p>
        </div>
        <div className="pagehead__actions">
          {dataUpdatedAt > 0 && (
            <span className="muted mono" style={{ fontSize: 12 }}>
              Actualizado {formatTime(dataUpdatedAt)}
            </span>
          )}
          <button
            className="btn"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <Icon
              name="refresh"
              size={15}
              className={isFetching ? 'spin' : undefined}
            />
            Actualizar
          </button>
        </div>
      </div>

      {!isLoading && !isError && views.length > 0 && (
        <div className="bitacora-filters">
          <div className="bitacora-filters__field">
            <label htmlFor="filter-coordinator">Coordinador</label>
            <select
              id="filter-coordinator"
              className="field__control"
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
            >
              <option value="">Todos</option>
              {coordinators.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="bitacora-filters__field">
            <label htmlFor="filter-type">Acción</label>
            <select
              id="filter-type"
              className="field__control"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Todas</option>
              {presentTypes.map((t) => (
                <option key={t} value={t}>
                  {actionLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="bitacora-search">
            <Icon name="search" size={15} />
            <input
              type="search"
              placeholder="Buscar por prestador, persona o nota…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar en la bitácora"
            />
          </div>
          {hasFilter && (
            <button className="chipfilter" onClick={clearFilters}>
              <Icon name="close" size={13} />
              Limpiar
            </button>
          )}
        </div>
      )}

      {isLoading && <BitacoraSkeleton />}

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {!isLoading && !isError && views.length === 0 && (
        <EmptyState
          icon="activity"
          title="Todavía no se registraron acciones"
          text="Cuando coordinación marque un contacto, asigne un reemplazo o tome una decisión sobre un servicio, va a quedar acá con su responsable, el prestador y la persona a cuidar."
        />
      )}

      {!isLoading && !isError && views.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon="search"
          title="Ninguna acción coincide con el filtro"
          text="Ajustá el coordinador, el tipo de acción o el texto de búsqueda."
          action={
            <button className="btn" onClick={clearFilters}>
              Limpiar filtros
            </button>
          }
        />
      )}

      {!isLoading &&
        !isError &&
        groups.map((group) => {
          let rowIndex = 0;
          return (
            <section key={group.key} className="bitacora-day">
              <header className="bitacora-day__head">
                <span className="bitacora-day__label">{group.label}</span>
                <span className="bitacora-day__rule" aria-hidden="true" />
                <span className="bitacora-day__count">{group.items.length}</span>
              </header>
              <div className="bitacora-list">
                {group.items.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} index={rowIndex++} />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}

/** Una acción como entrada de bitácora: qué se hizo, quién, sobre qué servicio. */
function LogEntry({ entry, index }: { entry: ActionView; index: number }) {
  const isReplacement =
    Boolean(entry.previousProvider) && Boolean(entry.provider);
  return (
    <article
      className="logentry"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <span
        className={`logentry__lead semaforo semaforo--${entry.tone}`}
        aria-hidden="true"
      >
        <span className="semaforo__dot" />
      </span>

      <div className="logentry__body">
        <div className="logentry__top">
          <h3 className="logentry__action">{entry.label}</h3>
          <time className="logentry__time mono">
            {formatTime(entry.createdAt)}
          </time>
        </div>

        <p className="logentry__by">
          {entry.coordinator ? (
            <>
              <span className="logentry__coord">{entry.coordinator}</span>
              <span className="logentry__role"> · coordinación</span>
            </>
          ) : (
            <span className="logentry__coord logentry__coord--missing">
              Coordinador no registrado
            </span>
          )}
        </p>

        <div className="logentry__service">
          <Fact label="Prestador">
            {isReplacement ? (
              <span className="logentry__swap">
                <span className="logentry__swap-from">
                  {entry.previousProvider}
                </span>
                <Icon name="arrow-right" size={13} />
                <span>{entry.provider}</span>
              </span>
            ) : entry.provider ? (
              entry.provider
            ) : (
              <span className="logentry__missing">Sin prestador asignado</span>
            )}
          </Fact>
          <Fact label="Persona a cuidar">
            {entry.patient ?? (
              <span className="logentry__missing">Sin persona vinculada</span>
            )}
          </Fact>
          <Fact label="Horario">
            <span className="mono">
              {formatTimeRange(entry.startTime, entry.endTime)}
            </span>
            <span className="logentry__date">
              {' '}
              · {formatDateShort(entry.startTime)}
            </span>
          </Fact>
        </div>

        {entry.notes && (
          <p className="logentry__note">
            <Icon name="edit" size={13} />
            <span>{entry.notes}</span>
          </p>
        )}

        {entry.assignmentId && (
          <Link
            className="logentry__link"
            to={`/servicio/${entry.assignmentId}`}
          >
            Ver ficha del servicio
            <Icon name="arrow-right" size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}

/** Un dato del servicio: etiqueta corta arriba, valor abajo. */
function Fact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="logentry__fact">
      <span className="logentry__factlabel">{label}</span>
      <span className="logentry__factval">{children}</span>
    </div>
  );
}

/** Esqueleto de carga con la silueta de las entradas de la bitácora. */
function BitacoraSkeleton() {
  return (
    <div
      className="bitacora-day"
      aria-busy="true"
      aria-label="Cargando acciones"
    >
      <header className="bitacora-day__head">
        <div className="skeleton" style={{ height: 12, width: 56 }} />
        <span className="bitacora-day__rule" aria-hidden="true" />
      </header>
      <div className="bitacora-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="logentry logentry--skeleton">
            <span className="logentry__lead" aria-hidden="true">
              <span className="semaforo__dot" />
            </span>
            <div className="logentry__body">
              <div className="skeleton" style={{ height: 16, width: '38%' }} />
              <div
                className="skeleton"
                style={{ height: 12, width: '24%', marginTop: 10 }}
              />
              <div
                className="skeleton"
                style={{ height: 38, width: '80%', marginTop: 12 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
