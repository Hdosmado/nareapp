import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../lib/api';
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import { Icon } from '../components/Icon';
import { StatusChip } from '../components/StatusChip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { EmptyState, ErrorState, TableSkeleton } from '../components/states';

/** Acción de aprobación pendiente de confirmación. */
type DeviceAction = 'approve' | 'reject' | 'revoke';

interface Pending {
  deviceId: string;
  action: DeviceAction;
  deviceLabel: string;
}

const ACTION_COPY: Record<
  DeviceAction,
  { verb: string; title: string; toast: string }
> = {
  approve: {
    verb: 'Aprobar',
    title: 'Aprobar dispositivo',
    toast: 'Dispositivo aprobado. Queda operativo.',
  },
  reject: {
    verb: 'Rechazar',
    title: 'Rechazar dispositivo',
    toast: 'Dispositivo rechazado.',
  },
  revoke: {
    verb: 'Revocar',
    title: 'Revocar dispositivo',
    toast: 'Dispositivo revocado.',
  },
};

/** Nombre legible del prestador dueño del dispositivo. */
function providerName(device: Row): string {
  const apellido = String(getValue(device, 'provider.apellido') ?? '');
  const nombre = String(getValue(device, 'provider.nombre') ?? '');
  const full = `${apellido} ${nombre}`.trim();
  return full.length > 0 ? full : 'Prestador sin datos';
}

/** Vista de dispositivos pendientes de aprobación de coordinación. */
export function DevicesPendingPage() {
  const notify = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['devices-pending'],
    queryFn: () => apiFetch<Row[]>('/coordination/devices/pending'),
  });

  const devices = data ?? [];

  /** Ejecuta la decisión confirmada sobre el dispositivo. */
  async function runPending(): Promise<void> {
    if (!pending) return;
    setBusy(true);
    try {
      await apiFetch(
        `/coordination/devices/${pending.deviceId}/${pending.action}`,
        { method: 'POST' },
      );
      notify(ACTION_COPY[pending.action].toast);
      void queryClient.invalidateQueries({ queryKey: ['devices-pending'] });
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
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
          <div className="eyebrow">Operación</div>
          <h1 className="pagehead__title">Dispositivos pendientes</h1>
          <p className="pagehead__desc">
            Dispositivos mobile de prestadores a la espera de una decisión de
            coordinación.
          </p>
        </div>
        <div className="pagehead__actions">
          <button className="btn" onClick={() => refetch()}>
            <Icon name="refresh" size={15} />
            Actualizar
          </button>
        </div>
      </div>

      {isLoading && <TableSkeleton cols={5} />}

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {!isLoading && !isError && devices.length === 0 && (
        <EmptyState
          icon="check"
          title="No hay dispositivos pendientes"
          text="Cuando un prestador registre un dispositivo nuevo aparecerá acá para aprobarlo."
        />
      )}

      {!isLoading && !isError && devices.length > 0 && (
        <div className="tablecard">
          <div className="tablescroll">
            <table>
              <thead>
                <tr>
                  <th>Prestador</th>
                  <th>Dispositivo</th>
                  <th>Plataforma</th>
                  <th>Registrado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, i) => {
                  const deviceId = String(device.id ?? '');
                  const label = `${providerName(device)} · ${String(
                    getValue(device, 'deviceId') ?? '',
                  )}`;
                  return (
                    <tr key={deviceId || i}>
                      <td className="cell-strong">{providerName(device)}</td>
                      <td className="cell-mono">
                        {String(getValue(device, 'deviceId') ?? '—')}
                      </td>
                      <td>
                        <StatusChip value={getValue(device, 'plataforma')} />
                        {getValue(device, 'modelo') ? (
                          <span className="muted">
                            {' '}
                            {humanize(String(getValue(device, 'modelo')))}
                          </span>
                        ) : null}
                      </td>
                      <td className="cell-mono">
                        {formatDateTime(getValue(device, 'createdAt'))}
                      </td>
                      <td>
                        <div className="row gap-2 wrap">
                          <button
                            className="btn btn--sm btn--primary"
                            disabled={busy}
                            onClick={() =>
                              setPending({
                                deviceId,
                                action: 'approve',
                                deviceLabel: label,
                              })
                            }
                          >
                            <Icon name="check" size={14} />
                            Aprobar
                          </button>
                          <button
                            className="btn btn--sm btn--danger"
                            disabled={busy}
                            onClick={() =>
                              setPending({
                                deviceId,
                                action: 'reject',
                                deviceLabel: label,
                              })
                            }
                          >
                            <Icon name="close" size={14} />
                            Rechazar
                          </button>
                          <button
                            className="btn btn--sm"
                            disabled={busy}
                            onClick={() =>
                              setPending({
                                deviceId,
                                action: 'revoke',
                                deviceLabel: label,
                              })
                            }
                          >
                            <Icon name="lock" size={14} />
                            Revocar
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
      )}

      {pending && (
        <ConfirmDialog
          title={ACTION_COPY[pending.action].title}
          message={`Se va a ${ACTION_COPY[
            pending.action
          ].verb.toLowerCase()} el dispositivo «${pending.deviceLabel}». ¿Confirmás la acción?`}
          confirmLabel={ACTION_COPY[pending.action].verb}
          busy={busy}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
