import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../lib/api';
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import { Icon, type IconName } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RelationSelect } from '../components/RelationSelect';
import { useToast } from '../components/ToastProvider';
import { ErrorState } from '../components/states';
import type { RefDef } from '../lib/refs';

/** Referencia para el selector de prestador de reemplazo. */
const PROVIDER_REF: RefDef = {
  resource: 'providers',
  labelKeys: ['apellido', 'nombre'],
};

/** Primer valor presente entre varias claves candidatas. */
function pick(obj: Row, keys: string[]): unknown {
  for (const key of keys) {
    const value = getValue(obj, key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** Primer objeto anidado presente entre varias claves candidatas. */
function pickObject(obj: Row, keys: string[]): Row | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Row;
    }
  }
  return undefined;
}

/** Primer arreglo presente entre varias claves candidatas. */
function pickArray(obj: Row, keys: string[]): Row[] {
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value as Row[];
  }
  return [];
}

interface TimelineEntry {
  time: unknown;
  title: string;
  text: string;
  tone: string;
}

/** Resultado de la ficha: una asignación operativa o un servicio sin asignar. */
interface DetailResult {
  kind: 'assignment' | 'service';
  data: Row;
}

/** Acción de coordinación pendiente de confirmación. */
type Pending =
  | { type: 'mark-contacted' }
  | { type: 'require-replacement' }
  | { type: 'assign-replacement' }
  | { type: 'resolve-alert'; alertId: string; alertLabel: string };

/** Carga la ficha: prueba como asignación y, si no existe, como servicio. */
async function loadDetail(id: string): Promise<DetailResult> {
  try {
    const assignment = await apiFetch<Row>(`/coordination/assignments/${id}`);
    return { kind: 'assignment', data: assignment };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const service = await apiFetch<Row>(`/coordination/services/${id}`);
      return { kind: 'service', data: service };
    }
    throw err;
  }
}

/** Ficha de servicio: hub que conecta domicilio, persona, prestador y campo. */
export function ServiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['service-detail', id],
    queryFn: () => loadDetail(id),
    enabled: Boolean(id),
  });

  const detail = data?.data ?? {};
  const isAssignment = data?.kind === 'assignment';

  const alertsQuery = useQuery({
    queryKey: ['service-alerts', id],
    queryFn: () => apiFetch<Row[]>('/coordination/alerts'),
    enabled: Boolean(id) && isAssignment,
  });

  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [replacementProvider, setReplacementProvider] = useState('');

  const patient = pickObject(detail, ['patient', 'persona', 'paciente']);
  const address = pickObject(detail, [
    'address',
    'patientAddress',
    'domicilio',
  ]);
  const provider = pickObject(detail, ['provider', 'prestador']);
  const service = pickObject(detail, ['service', 'servicio']) ?? detail;

  const status = pick(detail, ['status', 'estado']);
  const risk = pick(detail, ['riskLevel', 'risk', 'nivelRiesgo']);

  const timeline = useMemo<TimelineEntry[]>(() => {
    const attendance = pickArray(detail, [
      'attendanceEvents',
      'attendance',
      'eventosAsistencia',
    ]);
    const locations = pickArray(detail, [
      'locationEvents',
      'locations',
      'eventosUbicacion',
    ]);
    const entries: TimelineEntry[] = [];
    for (const ev of attendance) {
      entries.push({
        time: pick(ev, ['timestampServer', 'timestampLocal', 'createdAt']),
        title: `Asistencia · ${humanize(String(pick(ev, ['type']) ?? 'evento'))}`,
        text:
          pick(ev, ['insideAllowedRadius']) === false
            ? 'Registrado fuera del radio permitido.'
            : 'Registrado dentro del radio permitido.',
        tone: pick(ev, ['insideAllowedRadius']) === false ? 'naranja' : 'verde',
      });
    }
    for (const ev of locations) {
      entries.push({
        time: pick(ev, ['timestampServer', 'timestampLocal', 'createdAt']),
        title: 'Punto de ubicación',
        text: `Conectividad: ${humanize(
          String(pick(ev, ['connectivityStatus']) ?? 'desconocida'),
        )}`,
        tone: 'accent',
      });
    }
    return entries
      .filter((e) => e.time)
      .sort((a, b) => String(b.time).localeCompare(String(a.time)));
  }, [detail]);

  // Alertas activas que corresponden a esta asignación.
  const alerts = useMemo<Row[]>(() => {
    const all = alertsQuery.data ?? [];
    return all.filter((alert) => getValue(alert, 'assignment.id') === id);
  }, [alertsQuery.data, id]);

  /** Invalida las consultas afectadas por una acción de coordinación. */
  function invalidateAfterAction(): void {
    void queryClient.invalidateQueries({ queryKey: ['service-detail', id] });
    void queryClient.invalidateQueries({ queryKey: ['service-alerts', id] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['services-today'] });
  }

  /** Ejecuta la acción de coordinación confirmada contra el backend. */
  async function runPending(): Promise<void> {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.type === 'mark-contacted') {
        await apiFetch(`/coordination/services/${id}/mark-contacted`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        notify('Se registró el contacto con el prestador.');
      } else if (pending.type === 'require-replacement') {
        await apiFetch(`/coordination/services/${id}/require-replacement`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        notify('El servicio quedó marcado como que requiere reemplazo.');
      } else if (pending.type === 'assign-replacement') {
        await apiFetch(`/coordination/services/${id}/assign-replacement`, {
          method: 'POST',
          body: JSON.stringify({ providerId: replacementProvider }),
        });
        notify('Reemplazo asignado. Se creó una nueva asignación.');
        setReplacementProvider('');
      } else {
        await apiFetch(`/coordination/alerts/${pending.alertId}/resolve`, {
          method: 'POST',
        });
        notify('Alerta resuelta.');
      }
      invalidateAfterAction();
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

  /** Texto del diálogo de confirmación según la acción pendiente. */
  function confirmCopy(p: Pending): {
    title: string;
    message: string;
    label: string;
  } {
    switch (p.type) {
      case 'mark-contacted':
        return {
          title: 'Marcar contactado',
          message:
            'Se va a registrar que coordinación contactó al prestador de este servicio. ¿Confirmás la acción?',
          label: 'Marcar contactado',
        };
      case 'require-replacement':
        return {
          title: 'Requiere reemplazo',
          message:
            'El servicio va a quedar marcado como que requiere un reemplazo. ¿Confirmás la acción?',
          label: 'Marcar reemplazo',
        };
      case 'assign-replacement':
        return {
          title: 'Asignar reemplazo',
          message:
            'Se va a cancelar la asignación actual y crear una nueva con el prestador de reemplazo seleccionado. ¿Confirmás la acción?',
          label: 'Asignar reemplazo',
        };
      case 'resolve-alert':
        return {
          title: 'Resolver alerta',
          message: `Se va a marcar como resuelta la alerta «${p.alertLabel}». ¿Confirmás la acción?`,
          label: 'Resolver alerta',
        };
    }
  }

  return (
    <div className="page">
      <button className="crumb" onClick={() => navigate(-1)}>
        <Icon name="chevron-left" size={15} />
        Volver
      </button>

      <div className="pagehead">
        <div>
          <div className="eyebrow">
            {isAssignment ? 'Servicio asignado' : 'Ficha de servicio'}
          </div>
          <h1 className="pagehead__title">
            {String(
              pick(service, ['ciudad', 'city']) ?? 'Servicio domiciliario',
            )}
          </h1>
          <p className="pagehead__desc mono">{id}</p>
        </div>
        <div className="pagehead__actions">
          {status !== undefined && <StatusChip value={status} />}
          {risk !== undefined && <StatusChip value={risk} />}
          <button
            className="btn"
            onClick={() => {
              void refetch();
              void alertsQuery.refetch();
            }}
          >
            <Icon name="refresh" size={15} />
            Actualizar
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="skel-stack">
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 240 }} />
        </div>
      )}

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {data && (
        <div className="detail-grid">
          <div className="stack gap-4">
            <section className="card">
              <div className="card__head">
                <div className="card__title">Datos del servicio</div>
              </div>
              <div className="card__body">
                <dl className="kv">
                  <dt>Fecha</dt>
                  <dd>
                    {formatDateTime(pick(service, ['fecha', 'startTime']))}
                  </dd>
                  <dt>Inicio</dt>
                  <dd>{formatDateTime(pick(service, ['startTime']))}</dd>
                  <dt>Fin</dt>
                  <dd>{formatDateTime(pick(service, ['endTime']))}</dd>
                  <dt>Ciudad</dt>
                  <dd>{String(pick(service, ['ciudad', 'city']) ?? '—')}</dd>
                  <dt>Provincia</dt>
                  <dd>
                    {String(pick(service, ['provincia', 'province']) ?? '—')}
                  </dd>
                  <dt>Estado</dt>
                  <dd>
                    {status !== undefined ? (
                      <StatusChip value={status} />
                    ) : (
                      '—'
                    )}
                  </dd>
                </dl>
              </div>
            </section>

            <section className="card">
              <div className="card__head">
                <div className="card__title">Vínculos del servicio</div>
              </div>
              <div className="card__body stack gap-3">
                <RelationRow
                  icon="users"
                  title="Persona a cuidar"
                  primary={
                    patient
                      ? `${String(pick(patient, ['apellido']) ?? '')} ${String(
                          pick(patient, ['nombre']) ?? '',
                        )}`.trim()
                      : null
                  }
                  secondary={
                    patient
                      ? String(pick(patient, ['telefonoContacto']) ?? '')
                      : null
                  }
                />
                <RelationRow
                  icon="pin"
                  title="Domicilio"
                  primary={
                    address
                      ? String(pick(address, ['calle']) ?? 'Domicilio')
                      : null
                  }
                  secondary={
                    address
                      ? `${String(pick(address, ['ciudad']) ?? '')} ${String(
                          pick(address, ['provincia']) ?? '',
                        )}`.trim()
                      : null
                  }
                />
                <RelationRow
                  icon="briefcase"
                  title="Prestador asignado"
                  primary={
                    provider
                      ? `${String(pick(provider, ['apellido']) ?? '')} ${String(
                          pick(provider, ['nombre']) ?? '',
                        )}`.trim()
                      : null
                  }
                  secondary={
                    provider
                      ? humanize(
                          String(pick(provider, ['tipoPrestador']) ?? ''),
                        )
                      : null
                  }
                />
              </div>
            </section>

            {isAssignment && (
              <section className="card">
                <div className="card__head">
                  <div className="card__title">Acciones de coordinación</div>
                </div>
                <div className="card__body stack gap-3">
                  <p className="muted" style={{ fontSize: 13 }}>
                    Acciones operativas de un clic sobre este servicio
                    asignado. Cada una queda registrada en la traza de
                    coordinación.
                  </p>
                  <div className="row gap-2 wrap">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => setPending({ type: 'mark-contacted' })}
                    >
                      <Icon name="phone" size={15} />
                      Marcar contactado
                    </button>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() =>
                        setPending({ type: 'require-replacement' })
                      }
                    >
                      <Icon name="alert" size={15} />
                      Requiere reemplazo
                    </button>
                  </div>

                  <div className="stack gap-2">
                    <label
                      className="field__label"
                      htmlFor="replacement-provider"
                    >
                      <b>Asignar reemplazo</b>
                    </label>
                    <RelationSelect
                      id="replacement-provider"
                      refDef={PROVIDER_REF}
                      value={replacementProvider}
                      onChange={setReplacementProvider}
                    />
                    <button
                      className="btn btn--primary"
                      disabled={busy || !replacementProvider}
                      onClick={() =>
                        setPending({ type: 'assign-replacement' })
                      }
                    >
                      <Icon name="refresh" size={15} />
                      Asignar reemplazo
                    </button>
                  </div>
                </div>
              </section>
            )}

            {!isAssignment && (
              <div className="banner banner--info">
                <Icon name="lock" size={16} className="banner__icon" />
                <span>
                  Este servicio todavía no tiene una asignación operativa. Las
                  acciones de coordinación se habilitan al ingresar desde el
                  tablero o la agenda.
                </span>
              </div>
            )}
          </div>

          <div className="stack gap-4">
            <section className="card">
              <div className="card__head">
                <div className="card__title">Alertas del servicio</div>
              </div>
              <div className="card__body">
                {!isAssignment ? (
                  <div className="row gap-2 muted">
                    <Icon name="lock" size={16} />
                    Las alertas se muestran sobre el servicio asignado.
                  </div>
                ) : alertsQuery.isLoading ? (
                  <div className="skel-stack">
                    <div className="skeleton" style={{ height: 52 }} />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="row gap-2 muted">
                    <Icon name="check" size={16} />
                    Sin alertas activas asociadas.
                  </div>
                ) : (
                  <div className="stack gap-2">
                    {alerts.map((alert, i) => {
                      const alertId = String(alert.id ?? '');
                      const alertLabel = humanize(
                        String(pick(alert, ['type']) ?? 'Alerta'),
                      );
                      return (
                        <div key={alertId || i} className="relcard">
                          <div className="relcard__icon">
                            <Icon name="alert" size={16} />
                          </div>
                          <div className="relcard__meta grow">
                            <b>{alertLabel}</b>
                            <span>
                              {formatDateTime(pick(alert, ['createdAt']))}
                            </span>
                          </div>
                          <StatusChip value={pick(alert, ['severity'])} />
                          <button
                            className="btn btn--sm"
                            disabled={busy || !alertId}
                            onClick={() =>
                              setPending({
                                type: 'resolve-alert',
                                alertId,
                                alertLabel,
                              })
                            }
                          >
                            <Icon name="check" size={14} />
                            Resolver alerta
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card__head">
                <div className="card__title">Línea de tiempo de campo</div>
              </div>
              <div className="card__body">
                {timeline.length === 0 ? (
                  <div className="row gap-2 muted">
                    <Icon name="clock" size={16} />
                    Todavía no hay eventos de campo registrados.
                  </div>
                ) : (
                  <div className="timeline">
                    {timeline.map((entry, i) => (
                      <div key={i} className="timeline__item">
                        <span
                          className={`timeline__dot ${toneClass(entry.tone)}`}
                        />
                        <div className="timeline__time">
                          {formatDateTime(entry.time)}
                        </div>
                        <div className="timeline__title">{entry.title}</div>
                        <div className="timeline__text">{entry.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
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

/** Clase de tono (define `--tone`) para el punto de la línea de tiempo. */
function toneClass(tone: string): string {
  return tone === 'accent' ? 'tone-blue' : `tone-${tone}`;
}

/** Fila de un vínculo del servicio (persona, domicilio o prestador). */
function RelationRow({
  icon,
  title,
  primary,
  secondary,
}: {
  icon: IconName;
  title: string;
  primary: string | null;
  secondary: string | null;
}) {
  return (
    <div className="relcard">
      <div className="relcard__icon">
        <Icon name={icon} size={17} />
      </div>
      <div className="relcard__meta grow">
        <b>{primary && primary.length > 0 ? primary : title}</b>
        <span>
          {primary && primary.length > 0
            ? secondary || title
            : 'Sin datos vinculados'}
        </span>
      </div>
    </div>
  );
}
