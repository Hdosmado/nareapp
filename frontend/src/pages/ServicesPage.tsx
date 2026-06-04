import { useMemo, useState } from 'react';
import { onActivate } from '../lib/a11y';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../lib/api';
import { getValue, humanize, type Row } from '../lib/format';
import { AssignmentStatus, RiskLevel } from '../lib/enums';
import { resourceByKey } from '../resources';
import { Icon } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { Semaforo } from '../components/Semaforo';
import { EntityFormModal } from '../components/EntityFormModal';
import { AssignProviderModal } from '../components/AssignProviderModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorState, TableSkeleton } from '../components/states';
import { useToast } from '../components/ToastProvider';

const LIMIT = 20;

type Scope = 'hoy' | 'todos';

type Modal =
  | { kind: 'create' }
  | { kind: 'edit'; row: Row }
  | { kind: 'assign'; row: Row }
  | null;

/** Asignación activa embebida en el servicio (la calcula el backend). */
function assignmentOf(row: Row): Row | null {
  const a = row.assignment;
  return a && typeof a === 'object' ? (a as Row) : null;
}

/** "Apellido, Nombre" a partir de un objeto con esas claves. */
function fullName(obj: Row | null | undefined): string {
  if (!obj) return '';
  const apellido = String(getValue(obj, 'apellido') ?? '').trim();
  const nombre = String(getValue(obj, 'nombre') ?? '').trim();
  return [apellido, nombre].filter(Boolean).join(', ');
}

/** Fecha corta local (ej. "02/06"). */
function shortDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

/** Rango horario local (ej. "14:00–18:00"). */
function timeRange(start: unknown, end: unknown): string {
  const fmt = (v: unknown) => {
    const d = new Date(v as string);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
  };
  const a = fmt(start);
  const b = fmt(end);
  if (!a && !b) return '';
  return `${a}–${b}`;
}

/** Pantalla única de Servicios: estado operativo + alta/edición/asignación. */
export function ServicesPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const servicesResource = resourceByKey('services');

  const [scope, setScope] = useState<Scope>('hoy');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [risk, setRisk] = useState('');
  const [sinAsignar, setSinAsignar] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Reinicia la paginación cuando cambia un filtro de servidor. */
  function withReset<T>(setter: (v: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  const query = useQuery({
    queryKey: ['services-list', scope, page, status, risk, sinAsignar],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('scope', scope);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      if (status) params.set('status', status);
      if (risk) params.set('risk', risk);
      if (sinAsignar) params.set('sinAsignar', '1');
      return apiFetch<Row[]>(`/coordination/services?${params.toString()}`);
    },
  });

  const data = useMemo(() => query.data ?? [], [query.data]);

  // Búsqueda sobre la página cargada (persona, domicilio, prestador), igual
  // que el resto del panel.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) => {
      const haystack = [
        fullName(getValue(row, 'patient') as Row | undefined),
        String(getValue(row, 'ciudad') ?? ''),
        String(getValue(row, 'provincia') ?? ''),
        fullName(assignmentOf(row)?.provider as Row | undefined),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data, search]);

  const hasFilters = Boolean(status || risk || sinAsignar);

  function clearFilters() {
    setPage(1);
    setStatus('');
    setRisk('');
    setSinAsignar(false);
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['services-list'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['services-today'] });
  }

  async function onConfirmDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await apiFetch(`/coordination/services/${String(confirm.id)}`, {
        method: 'DELETE',
      });
      setConfirm(null);
      notify('Servicio eliminado.');
      invalidate();
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : 'No se pudo eliminar',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">Servicios</h1>
          <p className="pagehead__desc">
            Prestaciones de cuidado, con su prestador, estado y riesgo. Desde
            acá se crea, edita y se asigna o reasigna el prestador.
          </p>
        </div>
        <div className="pagehead__actions">
          <button className="btn" onClick={() => void query.refetch()}>
            <Icon name="refresh" size={15} />
            Actualizar
          </button>
          <button
            className="btn btn--primary"
            onClick={() => setModal({ kind: 'create' })}
          >
            <Icon name="plus" size={16} />
            Nuevo servicio
          </button>
        </div>
      </div>

      <div className="svc-toolbar">
        <div className="segmented" role="tablist" aria-label="Alcance">
          {(['hoy', 'todos'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={scope === value}
              className={`segmented__btn${scope === value ? ' is-active' : ''}`}
              onClick={() => {
                setPage(1);
                setScope(value);
              }}
            >
              {value === 'hoy' ? 'Hoy' : 'Todos'}
            </button>
          ))}
        </div>
        <div className="search">
          <span className="icon-lead">
            <Icon name="search" size={16} />
          </span>
          <input
            placeholder="Buscar persona, domicilio o prestador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="toolbar__count">{rows.length} en pantalla</span>
      </div>

      <div className="filterbar">
        <button
          className={`chipfilter${status === '' ? ' is-active' : ''}`}
          onClick={() => withReset(setStatus)('')}
        >
          Todos los estados
        </button>
        {AssignmentStatus.map((opt) => (
          <button
            key={opt}
            className={`chipfilter${status === opt ? ' is-active' : ''}`}
            onClick={() => withReset(setStatus)(status === opt ? '' : opt)}
          >
            {humanize(opt)}
          </button>
        ))}
      </div>

      <div className="svc-signals">
        <div className="svc-signals__group">
          <label htmlFor="filter-risk">Riesgo</label>
          <select
            id="filter-risk"
            className="field__control"
            value={risk}
            onChange={(e) => withReset(setRisk)(e.target.value)}
          >
            <option value="">Cualquiera</option>
            {RiskLevel.map((opt) => (
              <option key={opt} value={opt}>
                {humanize(opt)}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`chipfilter${sinAsignar ? ' is-active' : ''}`}
          onClick={() => withReset(setSinAsignar)(!sinAsignar)}
        >
          <Icon name="users" size={13} />
          Sin asignar
        </button>
        {hasFilters && (
          <button className="btn btn--sm btn--ghost" onClick={clearFilters}>
            <Icon name="close" size={14} />
            Limpiar filtros
          </button>
        )}
      </div>

      {query.isLoading && <TableSkeleton cols={6} />}

      {query.isError && (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      )}

      {!query.isLoading && !query.isError && rows.length === 0 && (
        <EmptyState
          icon="briefcase"
          title={
            hasFilters || search
              ? 'Ningún servicio coincide'
              : scope === 'hoy'
                ? 'No hay servicios para hoy'
                : 'Todavía no hay servicios'
          }
          text={
            hasFilters || search
              ? 'Ajustá o limpiá los filtros para ver más servicios.'
              : 'Usá «Nuevo servicio» para crear la primera prestación a cubrir.'
          }
          action={
            !hasFilters && !search ? (
              <button
                className="btn btn--primary"
                onClick={() => setModal({ kind: 'create' })}
              >
                <Icon name="plus" size={16} />
                Nuevo servicio
              </button>
            ) : undefined
          }
        />
      )}

      {!query.isLoading && !query.isError && rows.length > 0 && (
        <>
          <div className="tablecard">
            <div className="tablescroll">
              <table>
                <thead>
                  <tr>
                    <th>Persona a cuidar</th>
                    <th>Cuándo</th>
                    <th>Domicilio</th>
                    <th>Prestador</th>
                    <th>Estado</th>
                    <th>Riesgo</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const assignment = assignmentOf(row);
                    const patient = getValue(row, 'patient') as Row | undefined;
                    const providerName = fullName(
                      assignment?.provider as Row | undefined,
                    );
                    const estado =
                      assignment?.status ?? getValue(row, 'estado');
                    const target = String(assignment?.id ?? row.id ?? '');
                    return (
                      <tr
                        key={String(row.id ?? i)}
                        className="is-clickable"
                        tabIndex={0}
                        aria-label={`Abrir servicio de ${
                          fullName(patient) || 'persona a cuidar'
                        }`}
                        onClick={() => navigate(`/servicio/${target}`)}
                        onKeyDown={onActivate(() =>
                          navigate(`/servicio/${target}`),
                        )}
                      >
                        <td>
                          <div className="cell-strong">
                            {fullName(patient) || 'Persona a cuidar'}
                          </div>
                          <div className="cell-sub mono">
                            {String(getValue(row, 'patient.dni') ?? '—')}
                          </div>
                        </td>
                        <td>
                          <div className="cell-mono">
                            {shortDate(
                              getValue(row, 'fecha') ??
                                getValue(row, 'startTime'),
                            )}
                          </div>
                          <div className="cell-sub mono">
                            {timeRange(
                              getValue(row, 'startTime'),
                              getValue(row, 'endTime'),
                            ) || '—'}
                          </div>
                        </td>
                        <td>
                          <div>
                            {String(getValue(row, 'address.calle') ?? '—')}
                          </div>
                          <div className="cell-sub">
                            {String(getValue(row, 'ciudad') ?? '')}
                          </div>
                        </td>
                        <td>
                          {providerName ? (
                            <span className="cell-strong">{providerName}</span>
                          ) : (
                            <span className="chip chip--amarillo">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="svc-state">
                            <StatusChip value={estado} />
                          </div>
                        </td>
                        <td>
                          {assignment ? (
                            <Semaforo value={assignment.riskLevel} />
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="col-actions">
                          <div className="rowactions">
                            <button
                              className="btn btn--ghost btn--sm btn--icon"
                              title={
                                assignment
                                  ? 'Reasignar prestador'
                                  : 'Asignar prestador'
                              }
                              aria-label={
                                assignment
                                  ? 'Reasignar prestador'
                                  : 'Asignar prestador'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ kind: 'assign', row });
                              }}
                            >
                              <Icon name="users" size={15} />
                            </button>
                            <button
                              className="btn btn--ghost btn--sm btn--icon"
                              title="Editar servicio"
                              aria-label="Editar servicio"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ kind: 'edit', row });
                              }}
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              className="btn btn--ghost btn--sm btn--icon"
                              title="Eliminar servicio"
                              aria-label="Eliminar servicio"
                              style={{ color: 'var(--danger)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirm(row);
                              }}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pager">
            <button
              className="btn btn--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="chevron-left" size={15} />
              Anterior
            </button>
            <span className="pager__info">Página {page}</span>
            <button
              className="btn btn--sm"
              disabled={data.length < LIMIT}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <Icon name="chevron-right" size={15} />
            </button>
          </div>
        </>
      )}

      {modal?.kind === 'assign' && (
        <AssignProviderModal
          serviceId={String(modal.row.id)}
          assignmentId={assignmentOf(modal.row)?.id as string | undefined}
          excludeProviderId={
            (assignmentOf(modal.row)?.provider as Row | undefined)?.id as
              | string
              | undefined
          }
          serviceLabel={
            fullName(getValue(modal.row, 'patient') as Row | undefined) ||
            String(getValue(modal.row, 'ciudad') ?? 'servicio')
          }
          onClose={() => setModal(null)}
          onSaved={(message) => {
            setModal(null);
            notify(message);
            invalidate();
          }}
        />
      )}

      {(modal?.kind === 'create' || modal?.kind === 'edit') &&
        servicesResource && (
          <EntityFormModal
            resource={servicesResource}
            mode={modal.kind}
            source={modal.kind === 'edit' ? modal.row : null}
            onClose={() => setModal(null)}
            onSaved={(message) => {
              setModal(null);
              notify(message);
              invalidate();
            }}
          />
        )}

      {confirm && (
        <ConfirmDialog
          title="Eliminar servicio"
          message="Esta acción borra el servicio de forma permanente. Si tiene una asignación operativa, primero hay que resolverla. ¿Confirmás eliminar este servicio?"
          busy={deleting}
          onConfirm={onConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
