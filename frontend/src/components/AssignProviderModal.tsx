import { useState, type FormEvent } from 'react';
import { ApiError, apiFetch } from '../lib/api';
import type { RefDef } from '../lib/refs';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { RelationSelect } from './RelationSelect';

/** Selector de prestador para asignar o reasignar. */
const PROVIDER_REF: RefDef = {
  resource: 'providers',
  labelKeys: ['apellido', 'nombre'],
};

/**
 * Asigna o reasigna el prestador de un servicio.
 *
 * - Sin asignación activa (`assignmentId` ausente): crea la asignación con
 *   `POST /coordination/assignments` (persona, domicilio y horario se copian
 *   del servicio en el backend).
 * - Con asignación activa: reasigna con `assign-replacement`, que cancela la
 *   actual y crea una nueva conservando la traza del prestador anterior.
 */
export function AssignProviderModal({
  serviceId,
  assignmentId,
  serviceLabel,
  excludeProviderId,
  onClose,
  onSaved,
}: {
  serviceId: string;
  assignmentId?: string | null;
  serviceLabel: string;
  /** Prestador actual: al reasignar no se ofrece a sí mismo en las opciones. */
  excludeProviderId?: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const reassigning = Boolean(assignmentId);
  const [provider, setProvider] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!provider) {
      setError('Elegí un prestador para continuar.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (reassigning) {
        await apiFetch(
          `/coordination/services/${assignmentId}/assign-replacement`,
          {
            method: 'POST',
            body: JSON.stringify({ providerId: provider }),
          },
        );
        onSaved('Prestador reasignado. Se registró el reemplazo.');
      } else {
        await apiFetch('/coordination/assignments', {
          method: 'POST',
          body: JSON.stringify({ serviceId, providerId: provider }),
        });
        onSaved('Prestador asignado. Se creó la asignación operativa.');
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo asignar el prestador',
      );
      setBusy(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      onSubmit={onSubmit}
      className="modal--narrow"
      label={reassigning ? 'Reasignar prestador' : 'Asignar prestador'}
    >
          <div className="modal__head">
            <div>
              <div className="modal__title">
                {reassigning ? 'Reasignar prestador' : 'Asignar prestador'}
              </div>
              <div className="modal__subtitle">Servicio · {serviceLabel}</div>
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
            {error && (
              <div className="banner banner--error">
                <Icon name="alert" size={16} className="banner__icon" />
                <span>{error}</span>
              </div>
            )}

            <p className="muted" style={{ fontSize: 13, marginBottom: 'var(--sp-3)' }}>
              {reassigning
                ? 'Se cancela la asignación actual y se crea una nueva con el prestador elegido. El prestador anterior queda notificado.'
                : 'Se crea la asignación operativa del servicio: persona, domicilio y horario se copian del servicio.'}
            </p>

            <div className="field">
              <label className="field__label" htmlFor="assign-provider-select">
                Prestador {!provider && <b>*</b>}
              </label>
              <RelationSelect
                id="assign-provider-select"
                refDef={PROVIDER_REF}
                value={provider}
                onChange={setProvider}
                excludeId={excludeProviderId ?? undefined}
              />
            </div>
          </div>

          <div className="modal__foot">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={busy || !provider}
            >
              {busy && <Icon name="spinner" size={15} className="spin" />}
              {busy
                ? 'Guardando…'
                : reassigning
                  ? 'Reasignar prestador'
                  : 'Asignar prestador'}
            </button>
          </div>
    </Modal>
  );
}
