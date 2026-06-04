import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, apiFetch } from '../lib/api';
import {
  formatDateShort,
  formatTime,
  formatTimeRange,
  type Row,
} from '../lib/format';
import {
  alertStatusLabel,
  alertTypeDetail,
  alertTypeLabel,
  SEVERITIES,
  severityLabel,
  severityTone,
} from '../lib/alerts';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { EmptyState, ErrorState, TableSkeleton } from '../components/states';

const HISTORY_LIMIT = 20;

type Tab = 'activas' | 'historial';

/** Vista normalizada de una alerta para la grilla de triage. */
interface AlertView {
  id: string;
  type: string;
  severity: string;
  status: string;
  assignmentId: string;
  createdAt: unknown;
  resolvedAt: unknown;
  startTime: unknown;
  endTime: unknown;
  provider: { name: string; phone: string } | null;
  patient: { name: string; phone: string } | null;
}

/** Acción de coordinación pendiente de confirmación. */
type Pending =
  | { kind: 'contacted'; assignmentId: string; label: string }
  | { kind: 'resolve'; alertId: string; label: string };

/** Nombre «Apellido Nombre» a partir de un objeto con esas claves. */
function fullName(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  const row = obj as Row;
  return `${String(row.apellido ?? '')} ${String(row.nombre ?? '')}`.trim();
}

/** Normaliza la fila cruda del backend a la vista de la grilla. */
function toView(row: Row): AlertView {
  const assignment = (row.assignment ?? {}) as Row;
  const providerRow = assignment.provider as Row | undefined;
  const patientRow = assignment.patient as Row | undefined;
  const providerName = fullName(providerRow);
  const patientName = fullName(patientRow);
  return {
    id: String(row.id ?? ''),
    type: String(row.type ?? ''),
    severity: String(row.severity ?? ''),
    status: String(row.status ?? 'abierta'),
    assignmentId: String(assignment.id ?? ''),
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    provider: providerName
      ? { name: providerName, phone: String(providerRow?.telefono ?? '') }
      : null,
    patient: patientName
      ? { name: patientName, phone: String(patientRow?.telefonoContacto ?? '') }
      : null,
  };
}

const UNRESOLVED = new Set(['abierta', 'en_gestion']);

/** Pantalla de alertas: grilla de activas + historial, filtrable y por fecha. */
export function AlertsPage() {
  const notify = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('activas');
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const activeQ = useQuery({
    queryKey: ['alerts-active'],
    queryFn: () => apiFetch<Row[]>('/coordination/alerts'),
    refetchInterval: 30_000,
    enabled: tab === 'activas',
  });

  const historyQ = useQuery({
    queryKey: ['alerts-history', page],
    queryFn: () =>
      apiFetch<Row[]>(
        `/coordination/alerts/history?page=${page}&limit=${HISTORY_LIMIT}`,
      ),
    enabled: tab === 'historial',
  });

  const q = tab === 'activas' ? activeQ : historyQ;
  const views = useMemo(() => (q.data ?? []).map(toView), [q.data]);
  const nowMs = useMemo(() => Date.now(), [q.data]);

  /** Cambia de pestaña reiniciando filtro y paginación. */
  function switchTab(next: Tab) {
    setTab(next);
    setTypeFilter('');
    setPage(1);
  }

  // Conteo por severidad sobre las activas (resumen de cabecera).
  const severityCounts = useMemo(
    () =>
      SEVERITIES.map((sev) => ({
        severity: sev,
        count: views.filter((v) => v.severity === sev).length,
      })).filter((g) => g.count > 0),
    [views],
  );

  // Tipos presentes con su conteo, para los chips de filtro.
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of views) map.set(v.type, (map.get(v.type) ?? 0) + 1);
    return [...map.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) =>
        alertTypeLabel(a.type).localeCompare(alertTypeLabel(b.type)),
      );
  }, [views]);

  // Filas filtradas por tipo y ordenadas por fecha de detección descendente.
  const rows = useMemo(() => {
    const filtered = typeFilter
      ? views.filter((v) => v.type === typeFilter)
      : views;
    return [...filtered].sort((a, b) =>
      String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
    );
  }, [views, typeFilter]);

  const total = views.length;
  const isLoading = q.isLoading;
  const isError = q.isError;

  /** Texto del diálogo de confirmación según la acción pendiente. */
  function confirmCopy(p: Pending): {
    title: string;
    message: string;
    label: string;
  } {
    if (p.kind === 'contacted') {
      return {
        title: 'Marcar contactado',
        message: `Se va a registrar que coordinación contactó al prestador de ${p.label}. ¿Confirmás la acción?`,
        label: 'Marcar contactado',
      };
    }
    return {
      title: 'Resolver alerta',
      message: `Se va a marcar como resuelta la alerta «${p.label}». Va a pasar al historial cuando el servicio termine. ¿Confirmás la acción?`,
      label: 'Resolver alerta',
    };
  }

  /** Ejecuta contra el backend la acción confirmada. */
  async function runPending(): Promise<void> {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'contacted') {
        await apiFetch(
          `/coordination/services/${pending.assignmentId}/mark-contacted`,
          { method: 'POST', body: JSON.stringify({}) },
        );
        notify('Se registró el contacto con el prestador.');
      } else {
        await apiFetch(`/coordination/alerts/${pending.alertId}/resolve`, {
          method: 'POST',
        });
        notify('Alerta resuelta.');
      }
      void queryClient.invalidateQueries({ queryKey: ['alerts-active'] });
      void queryClient.invalidateQueries({ queryKey: ['alerts-history'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : 'No se pudo completar la acción',
        'error',
      );
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <div className="page">
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">Alertas operativas</h1>
          <p className="pagehead__desc">
            Servicios en riesgo detectados por el motor. Cada alerta dice a quién
            llamar y deja resolver el problema antes de que sea una ausencia.
          </p>
        </div>
        <div className="pagehead__actions">
          {q.dataUpdatedAt > 0 && (
            <span className="muted mono" style={{ fontSize: 12 }}>
              Actualizado {formatTime(q.dataUpdatedAt)}
            </span>
          )}
          <button
            className="btn"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
          >
            <Icon
              name="refresh"
              size={15}
              className={q.isFetching ? 'spin' : undefined}
            />
            Actualizar
          </button>
        </div>
      </div>

      <div className="svc-toolbar">
        <div className="segmented" role="tablist" aria-label="Vista de alertas">
          {(['activas', 'historial'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={`segmented__btn${tab === value ? ' is-active' : ''}`}
              onClick={() => switchTab(value)}
            >
              {value === 'activas' ? 'Activas' : 'Historial'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'activas' && !isLoading && !isError && total > 0 && (
        <div className="alert-summary" role="status">
          <span className="alert-summary__count">
            {total} {total === 1 ? 'alerta activa' : 'alertas activas'}
          </span>
          <span className="alert-summary__sep" aria-hidden="true" />
          {severityCounts.map((g) => (
            <span
              key={g.severity}
              className={`semaforo semaforo--${severityTone(g.severity)}`}
            >
              <span className="semaforo__dot" />
              {g.count} {severityLabel(g.severity).toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {!isLoading && !isError && total > 0 && (
        <div
          className="filterbar"
          role="group"
          aria-label="Filtrar por tipo de alerta"
        >
          <button
            className={`chipfilter${typeFilter === '' ? ' is-active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            Todos los tipos
            <span className="chipfilter__count">{total}</span>
          </button>
          {typeCounts.map(({ type, count }) => (
            <button
              key={type}
              className={`chipfilter${typeFilter === type ? ' is-active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            >
              {alertTypeLabel(type)}
              <span className="chipfilter__count">{count}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading && <TableSkeleton cols={7} />}

      {isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}

      {!isLoading && !isError && total === 0 && tab === 'activas' && (
        <EmptyState
          icon="check"
          title="Sin alertas activas"
          text="La operación del día está cubierta. Cuando el motor detecte un servicio en riesgo aparecerá acá, con el prestador y la persona a cuidar."
        />
      )}

      {!isLoading && !isError && total === 0 && tab === 'historial' && (
        <EmptyState
          icon="check"
          title={page > 1 ? 'No hay más historial' : 'Historial vacío'}
          text={
            page > 1
              ? 'Llegaste al final del historial de alertas.'
              : 'Todavía no hay alertas resueltas de servicios ya terminados. Cuando resuelvas una alerta de un servicio que ya pasó, va a quedar archivada acá.'
          }
          action={
            page > 1 ? (
              <button className="btn" onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevron-left" size={14} />
                Página anterior
              </button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && total > 0 && rows.length === 0 && (
        <EmptyState
          icon="search"
          title="Ningún tipo coincide"
          text="No hay alertas de ese tipo en esta vista. Quitá el filtro para ver todas."
          action={
            <button className="btn" onClick={() => setTypeFilter('')}>
              <Icon name="close" size={14} />
              Quitar filtro
            </button>
          }
        />
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="tablecard">
          <div className="tablescroll">
            <table>
              <thead>
                <tr>
                  <th>Severidad</th>
                  <th>Tipo de alerta</th>
                  <th>Prestador</th>
                  <th>Persona a cuidar</th>
                  <th>Servicio</th>
                  <th>Detectada</th>
                  <th className="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    tab={tab}
                    nowMs={nowMs}
                    busy={busy}
                    onAct={setPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'historial' && !isLoading && !isError && (rows.length > 0 || page > 1) && (
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
            disabled={total < HISTORY_LIMIT}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
            <Icon name="chevron-right" size={15} />
          </button>
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title={confirmCopy(pending).title}
          message={confirmCopy(pending).message}
          confirmLabel={confirmCopy(pending).label}
          busy={busy}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

/** Una alerta como fila de la grilla de triage. */
function AlertRow({
  alert,
  tab,
  nowMs,
  busy,
  onAct,
}: {
  alert: AlertView;
  tab: Tab;
  nowMs: number;
  busy: boolean;
  onAct: (p: Pending) => void;
}) {
  const tone = severityTone(alert.severity);
  const typeLabel = alertTypeLabel(alert.type);
  const detail = alertTypeDetail(alert.type);
  const hasProvider = Boolean(alert.provider);
  // El servicio queda identificado por la persona a cuidar (a quién deja colgada).
  const serviceLabel = alert.patient?.name ?? typeLabel;
  const unresolved = UNRESOLVED.has(alert.status);
  // Servicio cuyo horario de fin ya pasó pero la alerta sigue sin resolver:
  // se queda en activas, marcada como pendiente.
  const endedUnresolved =
    tab === 'activas' &&
    unresolved &&
    alert.endTime != null &&
    new Date(alert.endTime as string).getTime() < nowMs;

  return (
    <tr>
      <td>
        <span className={`semaforo semaforo--${tone}`}>
          <span className="semaforo__dot" />
          {severityLabel(alert.severity)}
        </span>
      </td>
      <td>
        <div className="alert-cell__type">
          <span className="cell-strong">{typeLabel}</span>
          {tab === 'activas' && alert.status === 'en_gestion' && (
            <span className="chip chip--accent">
              {alertStatusLabel(alert.status)}
            </span>
          )}
          {endedUnresolved && (
            <span className="chip chip--neutral">Servicio terminado</span>
          )}
          {tab === 'historial' && (
            <span
              className={`chip ${
                alert.status === 'resuelta' ? 'chip--verde' : 'chip--neutral'
              }`}
            >
              {alertStatusLabel(alert.status)}
            </span>
          )}
        </div>
        {detail && <div className="cell-sub">{detail}</div>}
      </td>
      <td>
        <PartyCell
          name={alert.provider?.name ?? null}
          phone={alert.provider?.phone ?? ''}
          missing="Sin prestador"
        />
      </td>
      <td>
        <PartyCell
          name={alert.patient?.name ?? null}
          phone={alert.patient?.phone ?? ''}
          missing="Sin persona"
        />
      </td>
      <td>
        <div className="cell-mono">
          {formatTimeRange(alert.startTime, alert.endTime)}
        </div>
        <div className="cell-sub">{formatDateShort(alert.startTime)}</div>
      </td>
      <td>
        <div className="cell-mono">{formatTime(alert.createdAt)}</div>
        <div className="cell-sub">{formatDateShort(alert.createdAt)}</div>
      </td>
      <td className="col-actions">
        <div className="rowactions">
          {tab === 'activas' && hasProvider && (
            <button
              className="btn btn--sm"
              disabled={busy}
              onClick={() =>
                onAct({
                  kind: 'contacted',
                  assignmentId: alert.assignmentId,
                  label: serviceLabel,
                })
              }
            >
              <Icon name="phone" size={14} />
              Contactado
            </button>
          )}
          {tab === 'activas' && (
            <button
              className="btn btn--sm"
              disabled={busy}
              onClick={() =>
                onAct({ kind: 'resolve', alertId: alert.id, label: typeLabel })
              }
            >
              <Icon name="check" size={14} />
              Resolver
            </button>
          )}
          {alert.assignmentId && (
            <Link
              className="btn btn--sm btn--ghost btn--icon"
              to={`/servicio/${alert.assignmentId}`}
              title="Ver ficha del servicio"
              aria-label="Ver ficha del servicio"
            >
              <Icon name="arrow-right" size={15} />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Celda de una de las partes del servicio: nombre + teléfono como llamada. */
function PartyCell({
  name,
  phone,
  missing,
}: {
  name: string | null;
  phone: string;
  missing: string;
}) {
  if (!name) {
    return <span className="chip chip--amarillo">{missing}</span>;
  }
  const dialable = phone.replace(/[^+\d]/g, '');
  return (
    <>
      <div className="cell-strong">{name}</div>
      {dialable ? (
        <a className="cell-tel" href={`tel:${dialable}`}>
          <Icon name="phone" size={12} />
          <span className="mono">{phone}</span>
        </a>
      ) : (
        <div className="cell-sub">Sin teléfono</div>
      )}
    </>
  );
}
