/**
 * Sección "Dispositivo" del prestador: gestiona la activación por código.
 * Coordinación genera acá un código de activación de 8 dígitos; el prestador
 * lo ingresa en la app (o se le pasa el mensaje de WhatsApp ya armado).
 * El código solo se puede mostrar en el momento en que se genera — el backend
 * guarda únicamente su hash.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ApiError, apiFetch } from '../lib/api';
import { formatDateTime, type Row } from '../lib/format';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

interface DeviceInfo {
  id: string;
  deviceId: string;
  plataforma: string;
  modelo?: string | null;
  estado: string;
  activatedAt?: string | null;
  revokedAt?: string | null;
  lastSeenAt?: string | null;
}

interface DeviceState {
  device: DeviceInfo | null;
  pendingToken: { id: string; expiresAt: string; createdAt: string } | null;
}

/** Respuesta del backend al generar una activación. */
interface ActivationResponse {
  tokenId: string;
  activationCode: string;
  activationCodeFormatted: string;
  qrUrl: string;
  expiresAt: string;
  whatsappMessage: string;
}

type UiState =
  | 'sin-dispositivo'
  | 'codigo-pendiente'
  | 'activo'
  | 'revocado'
  | 'reemplazo';

const STATE_META: Record<
  UiState,
  { label: string; chip: string; text: string }
> = {
  'sin-dispositivo': {
    label: 'Sin dispositivo',
    chip: 'chip--neutral',
    text: 'El prestador todavía no activó ningún teléfono. Generá un código de activación para que pueda activar la app.',
  },
  'codigo-pendiente': {
    label: 'Código pendiente',
    chip: 'chip--amarillo',
    text: 'Hay un código de activación vigente. El prestador debe ingresarlo en la app antes de que venza.',
  },
  activo: {
    label: 'Dispositivo activo',
    chip: 'chip--verde',
    text: 'El teléfono está vinculado y operativo. La app no vuelve a pedir activación.',
  },
  revocado: {
    label: 'Dispositivo revocado',
    chip: 'chip--rojo',
    text: 'El dispositivo fue revocado. La app pedirá un código nuevo para volver a operar.',
  },
  reemplazo: {
    label: 'Requiere reemplazo',
    chip: 'chip--naranja',
    text: 'El dispositivo fue marcado para reemplazo. Generá un código de activación para activar el teléfono nuevo.',
  },
};

/** Deriva el estado operativo a mostrar a partir de la respuesta del backend. */
function deriveState(data: DeviceState): UiState {
  const estado = data.device?.estado;
  if (estado === 'aprobado') return 'activo';
  if (data.pendingToken) return 'codigo-pendiente';
  if (estado === 'revocado') return 'revocado';
  if (estado === 'reemplazado') return 'reemplazo';
  return 'sin-dispositivo';
}

export function DeviceManagerModal({
  provider,
  onClose,
}: {
  provider: Row;
  onClose: () => void;
}) {
  const providerId = String(provider.id);
  const notify = useToast();
  const [generated, setGenerated] = useState<ActivationResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['provider-device', providerId],
    queryFn: () =>
      apiFetch<DeviceState>(`/coordination/providers/${providerId}/device`),
  });

  const name = `${String(provider.apellido ?? '')} ${String(
    provider.nombre ?? '',
  )}`.trim();

  /** Ejecuta una acción con manejo de error y estado de carga por botón. */
  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    try {
      await fn();
    } catch (err) {
      notify(
        err instanceof ApiError
          ? err.message
          : 'No se pudo completar la acción',
        'error',
      );
    } finally {
      setBusy(null);
    }
  }

  function generateActivation() {
    return run('generate', async () => {
      const res = await apiFetch<ActivationResponse>(
        `/coordination/providers/${providerId}/activation`,
        { method: 'POST' },
      );
      setGenerated(res);
      notify('Código de activación generado.');
      await refetch();
    });
  }

  function revokeActivation() {
    return run('revoke-activation', async () => {
      await apiFetch(
        `/coordination/providers/${providerId}/activation/revoke`,
        { method: 'POST' },
      );
      setGenerated(null);
      notify('Código de activación revocado.');
      await refetch();
    });
  }

  function revokeDevice(deviceRowId: string) {
    return run('revoke-device', async () => {
      await apiFetch(`/coordination/devices/${deviceRowId}/revoke`, {
        method: 'POST',
      });
      notify('Dispositivo revocado.');
      await refetch();
    });
  }

  function replaceDevice(deviceRowId: string) {
    return run('replace-device', async () => {
      await apiFetch(`/coordination/devices/${deviceRowId}/replace`, {
        method: 'POST',
      });
      notify('Dispositivo marcado para reemplazo.');
      await refetch();
    });
  }

  /** Copia un texto al portapapeles y avisa el resultado. */
  async function copy(text: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(okMessage);
    } catch {
      notify('No se pudo copiar al portapapeles.', 'error');
    }
  }

  const uiState = data ? deriveState(data) : null;
  const meta = uiState ? STATE_META[uiState] : null;
  const device = data?.device ?? null;
  const anyBusy = busy !== null;

  return (
    <Modal onClose={onClose} label={`Dispositivo de ${name}`}>
          <div className="modal__head">
            <div>
              <div className="modal__title">Dispositivo · {name}</div>
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

          <div className="modal__body">
            {isLoading && (
              <div className="skel-stack">
                <div className="skeleton" style={{ height: 64 }} />
                <div className="skeleton" style={{ height: 180 }} />
              </div>
            )}

            {isError && (
              <div className="banner banner--error">
                <Icon name="alert" size={16} className="banner__icon" />
                <span>
                  {error instanceof ApiError
                    ? error.message
                    : 'No se pudo cargar el estado del dispositivo.'}
                </span>
              </div>
            )}

            {data && meta && (
              <>
                <div
                  className="row gap-2 wrap"
                  style={{ marginBottom: 'var(--sp-3)' }}
                >
                  <span className={`chip ${meta.chip}`}>{meta.label}</span>
                </div>
                <p
                  className="muted"
                  style={{ marginBottom: 'var(--sp-4)', fontSize: 13 }}
                >
                  {meta.text}
                </p>

                {device && (
                  <dl
                    className="kv"
                    style={{ marginBottom: 'var(--sp-4)' }}
                  >
                    <dt>ID de dispositivo</dt>
                    <dd className="mono">{device.deviceId}</dd>
                    <dt>Plataforma</dt>
                    <dd>{device.plataforma}</dd>
                    {device.modelo && (
                      <>
                        <dt>Modelo</dt>
                        <dd>{device.modelo}</dd>
                      </>
                    )}
                    {device.activatedAt && (
                      <>
                        <dt>Activado</dt>
                        <dd className="mono">
                          {formatDateTime(device.activatedAt)}
                        </dd>
                      </>
                    )}
                    {device.lastSeenAt && (
                      <>
                        <dt>Última señal</dt>
                        <dd className="mono">
                          {formatDateTime(device.lastSeenAt)}
                        </dd>
                      </>
                    )}
                    {device.revokedAt && (
                      <>
                        <dt>Revocado</dt>
                        <dd className="mono">
                          {formatDateTime(device.revokedAt)}
                        </dd>
                      </>
                    )}
                  </dl>
                )}

                {generated ? (
                  <div className="codebox">
                    <span className="codebox__label">
                      Código de activación
                    </span>
                    <div className="codebox__code">
                      {generated.activationCodeFormatted}
                    </div>
                    <p className="codebox__hint">
                      Dictáselo al prestador o mandáselo por WhatsApp. Lo
                      ingresa en la app para activar el teléfono. Vence el{' '}
                      {formatDateTime(generated.expiresAt)}.
                    </p>
                    <button
                      type="button"
                      className="btn btn--sm btn--block"
                      onClick={() =>
                        copy(generated.activationCode, 'Código copiado.')
                      }
                    >
                      <Icon name="copy" size={14} />
                      Copiar código
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--block"
                      onClick={() =>
                        copy(
                          generated.whatsappMessage,
                          'Mensaje de WhatsApp copiado.',
                        )
                      }
                    >
                      <Icon name="phone" size={14} />
                      Copiar mensaje de WhatsApp
                    </button>

                    <details className="codebox__qr">
                      <summary>
                        <Icon name="qr" size={14} />
                        Mostrar QR (opcional)
                      </summary>
                      <div className="codebox__qrbody">
                        <div className="qrbox__code">
                          <QRCodeSVG value={generated.qrUrl} size={168} />
                        </div>
                        <p className="qrbox__hint">
                          Alternativa al código: el prestador puede escanear
                          este QR desde la app.
                        </p>
                      </div>
                    </details>
                  </div>
                ) : (
                  data.pendingToken && (
                    <div className="banner banner--info">
                      <Icon name="clock" size={16} className="banner__icon" />
                      <span>
                        Hay un código de activación vigente (vence{' '}
                        {formatDateTime(data.pendingToken.expiresAt)}). Por
                        seguridad no se puede volver a mostrar: generá uno
                        nuevo si lo necesitás.
                      </span>
                    </div>
                  )
                )}

                <div
                  className="stack gap-2"
                  style={{ marginTop: 'var(--sp-4)' }}
                >
                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    onClick={generateActivation}
                    disabled={anyBusy}
                  >
                    <Icon
                      name={busy === 'generate' ? 'spinner' : 'qr'}
                      size={15}
                      className={busy === 'generate' ? 'spin' : undefined}
                    />
                    {uiState === 'codigo-pendiente' || generated
                      ? 'Regenerar código'
                      : 'Generar código de activación'}
                  </button>

                  {data.pendingToken && (
                    <button
                      type="button"
                      className="btn btn--block"
                      onClick={revokeActivation}
                      disabled={anyBusy}
                    >
                      <Icon
                        name={
                          busy === 'revoke-activation' ? 'spinner' : 'close'
                        }
                        size={15}
                        className={
                          busy === 'revoke-activation' ? 'spin' : undefined
                        }
                      />
                      Revocar código vigente
                    </button>
                  )}

                  {device && device.estado === 'aprobado' && (
                    <>
                      <button
                        type="button"
                        className="btn btn--block"
                        onClick={() => replaceDevice(device.id)}
                        disabled={anyBusy}
                      >
                        <Icon
                          name={busy === 'replace-device' ? 'spinner' : 'refresh'}
                          size={15}
                          className={
                            busy === 'replace-device' ? 'spin' : undefined
                          }
                        />
                        Reemplazar dispositivo
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--block"
                        onClick={() => revokeDevice(device.id)}
                        disabled={anyBusy}
                      >
                        <Icon
                          name={busy === 'revoke-device' ? 'spinner' : 'lock'}
                          size={15}
                          className={
                            busy === 'revoke-device' ? 'spin' : undefined
                          }
                        />
                        Revocar dispositivo
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="modal__foot">
            <button type="button" className="btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
    </Modal>
  );
}
