import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../lib/api';
import { getValue, type Row } from '../lib/format';
import { Icon } from './Icon';
import { useToast } from './ToastProvider';
import { AddressFields, buildAddressPayload } from './AddressFields';

type Editor = { mode: 'add' } | { mode: 'edit'; id: string } | null;

/** Valores de formulario a partir de un domicilio existente. */
function addrToForm(addr: Row): Record<string, unknown> {
  return {
    calle: getValue(addr, 'calle') ?? '',
    ciudad: getValue(addr, 'ciudad') ?? '',
    provincia: getValue(addr, 'provincia') ?? '',
    latitude: getValue(addr, 'latitude') ?? '',
    longitude: getValue(addr, 'longitude') ?? '',
    allowedRadiusM: getValue(addr, 'allowedRadiusM') ?? '',
  };
}

/**
 * Domicilio opcional al dar de alta una persona nueva. El estado lo administra
 * el modal de la persona, que lo guarda recién después de crear la persona.
 */
export function PatientAddressDraft({
  draft,
  set,
}: {
  draft: Record<string, unknown>;
  set: (name: string, value: unknown) => void;
}) {
  return (
    <div className="modal__section">
      <div className="modal__section-head">
        <div className="card__title">Domicilio</div>
        <span className="chip chip--neutral">Opcional</span>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 'var(--sp-3)' }}>
        Cargá el primer domicilio ahora si querés. Después podés agregar más
        editando la persona.
      </p>
      <AddressFields values={draft} set={set} idPrefix="addr-new" />
    </div>
  );
}

/**
 * Subtabla de domicilios de una persona a cuidar (modo edición). Lista los
 * domicilios cargados y permite agregar, editar y eliminar en línea, sin abrir
 * otro modal encima.
 */
export function PatientAddressList({ patientId }: { patientId: string }) {
  const notify = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient-addresses', patientId],
    queryFn: () => apiFetch<Row>(`/coordination/patients/${patientId}`),
  });
  const addresses = ((data?.addresses as Row[] | undefined) ?? []).slice();

  const [editor, setEditor] = useState<Editor>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const set = (name: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  function openAdd() {
    setForm({});
    setError(null);
    setConfirmId(null);
    setEditor({ mode: 'add' });
  }
  function openEdit(addr: Row) {
    setForm(addrToForm(addr));
    setError(null);
    setConfirmId(null);
    setEditor({ mode: 'edit', id: String(addr.id) });
  }
  function closeEditor() {
    setEditor(null);
    setForm({});
    setError(null);
  }

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ['patient-addresses', patientId],
    });
    // El selector de "Domicilio" del alta de Servicios usa esta lista.
    void queryClient.invalidateQueries({
      queryKey: ['relation-options', 'patient-addresses'],
    });
  }

  async function save() {
    const result = buildAddressPayload(form, { optional: false });
    if (result.error) {
      setError(result.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editor?.mode === 'add') {
        await apiFetch(`/coordination/patients/${patientId}/addresses`, {
          method: 'POST',
          body: JSON.stringify(result.payload),
        });
        notify('Domicilio agregado.');
      } else if (editor?.mode === 'edit') {
        await apiFetch(`/coordination/patient-addresses/${editor.id}`, {
          method: 'PATCH',
          body: JSON.stringify(result.payload),
        });
        notify('Domicilio actualizado.');
      }
      invalidate();
      closeEditor();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo guardar el domicilio',
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/coordination/patient-addresses/${id}`, {
        method: 'DELETE',
      });
      notify('Domicilio eliminado.');
      invalidate();
      setConfirmId(null);
    } catch (err) {
      notify(
        err instanceof ApiError ? err.message : 'No se pudo eliminar',
        'error',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal__section">
      <div className="modal__section-head">
        <div className="card__title">Domicilios</div>
        {!editor && (
          <button type="button" className="btn btn--sm" onClick={openAdd}>
            <Icon name="plus" size={14} />
            Agregar domicilio
          </button>
        )}
      </div>

      {isLoading && (
        <div className="skel-stack">
          <div className="skeleton" style={{ height: 44 }} />
        </div>
      )}

      {isError && (
        <div className="banner banner--error">
          <Icon name="alert" size={15} className="banner__icon" />
          <span>No se pudieron cargar los domicilios.</span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void refetch()}
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && addresses.length === 0 && !editor && (
        <div className="muted" style={{ fontSize: 13, padding: '4px 0' }}>
          Esta persona todavía no tiene domicilios cargados.
        </div>
      )}

      {addresses.length > 0 && (
        <div className="addrlist">
          {addresses.map((addr) => {
            const id = String(addr.id);
            const radio = getValue(addr, 'allowedRadiusM');
            return (
              <div key={id} className="addrlist__row">
                <div className="addrlist__main">
                  <b>{String(getValue(addr, 'calle') ?? 'Domicilio')}</b>
                  <span>
                    {[getValue(addr, 'ciudad'), getValue(addr, 'provincia')]
                      .filter(Boolean)
                      .join(', ') || 'Sin localidad'}
                  </span>
                </div>
                <span className="chip chip--neutral">
                  {radio != null ? `${String(radio)} m` : '150 m'}
                </span>
                {confirmId === id ? (
                  <div className="addrlist__confirm">
                    <span className="muted">¿Eliminar?</span>
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      disabled={busy}
                      onClick={() => void remove(id)}
                    >
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={busy}
                      onClick={() => setConfirmId(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="rowactions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--icon"
                      title="Editar domicilio"
                      aria-label="Editar domicilio"
                      disabled={Boolean(editor)}
                      onClick={() => openEdit(addr)}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--icon"
                      title="Eliminar domicilio"
                      aria-label="Eliminar domicilio"
                      style={{ color: 'var(--danger)' }}
                      disabled={Boolean(editor)}
                      onClick={() => setConfirmId(id)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editor && (
        <div className="addrform">
          <div className="addrform__head">
            {editor.mode === 'add' ? 'Nuevo domicilio' : 'Editar domicilio'}
          </div>
          {error && (
            <div className="banner banner--error">
              <Icon name="alert" size={15} className="banner__icon" />
              <span>{error}</span>
            </div>
          )}
          <AddressFields
            values={form}
            set={set}
            idPrefix={`addr-${editor.mode}`}
          />
          <div className="addrform__foot">
            <button
              type="button"
              className="btn"
              onClick={closeEditor}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy && <Icon name="spinner" size={14} className="spin" />}
              {busy
                ? 'Guardando…'
                : editor.mode === 'add'
                  ? 'Agregar domicilio'
                  : 'Guardar domicilio'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
