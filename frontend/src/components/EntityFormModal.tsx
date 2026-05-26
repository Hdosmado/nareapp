import { useMemo, useState, type FormEvent } from 'react';
import { ApiError, apiFetch } from '../lib/api';
import { humanize, toDateTimeLocal, type Row } from '../lib/format';
import { refFor, type RefDef } from '../lib/refs';
import type { FieldDef, ResourceDef } from '../resources';
import { Icon } from './Icon';
import { JsonViewer } from './JsonViewer';
import { Portal } from './Portal';
import { RelationSelect } from './RelationSelect';

type Mode = 'create' | 'edit';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Valor inicial de un campo según el modo del formulario. */
function initialValue(field: FieldDef, mode: Mode, source: Row | null): unknown {
  if (mode === 'edit' && source) {
    let raw = source[field.name];
    // Las relaciones llegan como objeto anidado (ej. `patient`); si el campo
    // `patientId` no viene plano, se toma el id del objeto relacionado.
    if ((raw === undefined || raw === null) && field.name.endsWith('Id')) {
      const related = source[field.name.slice(0, -2)];
      if (related && typeof related === 'object') {
        raw = (related as Record<string, unknown>).id;
      }
    }
    if (field.type === 'password') return '';
    if (field.type === 'boolean') return Boolean(raw);
    if (field.type === 'datetime') return toDateTimeLocal(raw);
    if (field.type === 'date') return raw ? String(raw).slice(0, 10) : '';
    if (field.type === 'json') {
      return raw ? JSON.stringify(raw, null, 2) : '';
    }
    return raw ?? '';
  }
  return field.type === 'boolean' ? false : '';
}

/** Formulario modal genérico de alta y edición de cualquier entidad. */
export function EntityFormModal({
  resource,
  mode,
  source,
  onClose,
  onSaved,
}: {
  resource: ResourceDef;
  mode: Mode;
  source: Row | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  // Campos que participan del envío (filtrados por modo).
  const formFields = useMemo(
    () =>
      resource.fields.filter((f) =>
        mode === 'create' ? !f.editOnly : !f.createOnly,
      ),
    [resource, mode],
  );

  // Campos que se muestran: se ocultan los autogenerados y los de sólo
  // lectura al crear (no hay valor previo que consultar).
  const visibleFields = useMemo(
    () =>
      formFields.filter(
        (f) => !f.autogenerate && !(f.readOnly && mode === 'create'),
      ),
    [formFields, mode],
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of formFields) {
      initial[field.name] = initialValue(field, mode, source);
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  /** Arma el cuerpo de la petición; devuelve null si hay error de validación. */
  function buildPayload(): Record<string, unknown> | null {
    const payload: Record<string, unknown> = {};

    for (const field of formFields) {
      // Los datos de sólo lectura nunca se envían desde el panel.
      if (field.readOnly) continue;

      // Las claves de idempotencia se generan automáticamente al crear.
      if (field.autogenerate) {
        if (mode === 'create') payload[field.name] = crypto.randomUUID();
        continue;
      }

      const value = values[field.name];

      if (field.type === 'boolean') {
        payload[field.name] = Boolean(value);
        continue;
      }

      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed === undefined || trimmed === null) {
        if (mode === 'create' && field.required) {
          setError(`El campo «${field.label}» es obligatorio.`);
          return null;
        }
        continue;
      }

      if (field.type === 'number') {
        const num = Number(trimmed);
        if (Number.isNaN(num)) {
          setError(`El campo «${field.label}» debe ser numérico.`);
          return null;
        }
        payload[field.name] = num;
      } else if (field.type === 'datetime') {
        payload[field.name] = new Date(trimmed as string).toISOString();
      } else if (field.type === 'json') {
        try {
          payload[field.name] = JSON.parse(trimmed as string);
        } catch {
          setError(`El campo «${field.label}» no contiene JSON válido.`);
          return null;
        }
      } else {
        payload[field.name] = trimmed;
      }
    }
    return payload;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = buildPayload();
    if (!payload) return;

    setBusy(true);
    try {
      if (mode === 'create') {
        await apiFetch(resource.path, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        onSaved(`${capitalize(resource.singular)} creado correctamente.`);
      } else {
        await apiFetch(`${resource.path}/${String(source?.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        onSaved(`${capitalize(resource.singular)} actualizado.`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo guardar el registro',
      );
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div className="overlay" onClick={onClose}>
        <form
          className="modal"
          onClick={(e) => e.stopPropagation()}
          onSubmit={onSubmit}
          role="dialog"
          aria-modal="true"
          aria-label={`${mode === 'create' ? 'Nuevo' : 'Editar'} ${resource.singular}`}
        >
        <div className="modal__head">
          <div>
            <div className="eyebrow">
              {mode === 'create' ? 'Alta de registro' : 'Edición de registro'}
            </div>
            <div className="modal__title">
              {mode === 'create' ? 'Nuevo' : 'Editar'} {resource.singular}
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

        <div className="modal__body">
          {error && (
            <div className="banner banner--error">
              <Icon name="alert" size={16} className="banner__icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="formgrid">
            {visibleFields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                mode={mode}
                value={values[field.name]}
                refDef={refFor(resource.key, field.name)}
                onChange={(v) => set(field.name, v)}
              />
            ))}
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
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy && <Icon name="spinner" size={15} className="spin" />}
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        </form>
      </div>
    </Portal>
  );
}

/** Renderiza el control de entrada apropiado para un campo. */
function FieldControl({
  field,
  mode,
  value,
  refDef,
  onChange,
}: {
  field: FieldDef;
  mode: Mode;
  value: unknown;
  refDef: RefDef | undefined;
  onChange: (value: unknown) => void;
}) {
  const wide = field.wide || field.type === 'textarea' || field.type === 'json';
  const required = mode === 'create' && field.required;
  const str = typeof value === 'string' ? value : '';
  const fieldId = `f-${field.name}`;

  return (
    <div className={wide ? 'field field--wide' : 'field'}>
      <label className="field__label" htmlFor={fieldId}>
        {field.label} {required && <b>*</b>}
      </label>

      {field.readOnly ? (
        field.type === 'json' ? (
          <JsonViewer value={value} />
        ) : (
          <div className="readonly-value">
            <Icon name="lock" size={14} className="icon-lead" />
            <span>{str || '— sin dato —'}</span>
          </div>
        )
      ) : refDef ? (
        <RelationSelect
          id={fieldId}
          refDef={refDef}
          value={str}
          onChange={onChange}
        />
      ) : field.type === 'select' ? (
        <select
          id={fieldId}
          className="field__control"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— sin definir —</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {humanize(opt)}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <div className="field__check">
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="muted">{value ? 'Sí' : 'No'}</span>
        </div>
      ) : field.type === 'textarea' || field.type === 'json' ? (
        <textarea
          id={fieldId}
          className="field__control"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.type === 'json' ? '{ }' : ''}
          style={field.type === 'json' ? { fontFamily: 'var(--font-mono)' } : undefined}
        />
      ) : (
        <input
          id={fieldId}
          className="field__control"
          type={inputType(field.type)}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.hint && <div className="field__hint">{field.hint}</div>}
    </div>
  );
}

function inputType(type: FieldDef['type']): string {
  switch (type) {
    case 'email':
      return 'email';
    case 'password':
      return 'password';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime-local';
    default:
      return 'text';
  }
}
