/**
 * Detalle de solo lectura de un registro inmutable (eventos, notificaciones,
 * auditoría). Presenta cada campo formateado; nunca ofrece editar ni borrar.
 */
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import { refFor } from '../lib/refs';
import { relationLabel } from './RelationSelect';
import type { ResourceDef } from '../resources';
import { Icon } from './Icon';
import { JsonViewer } from './JsonViewer';
import { Portal } from './Portal';
import { StatusChip } from './StatusChip';

/** Devuelve la etiqueta legible de una relación a partir del objeto anidado. */
function relatedLabel(resourceKey: string, fieldName: string, row: Row) {
  const ref = refFor(resourceKey, fieldName);
  if (!ref) return null;
  const nested = row[fieldName.replace(/Id$/, '')];
  if (nested && typeof nested === 'object') {
    return relationLabel(nested as Row, ref.labelKeys);
  }
  return null;
}

export function RecordViewModal({
  resource,
  row,
  onClose,
}: {
  resource: ResourceDef;
  row: Row;
  onClose: () => void;
}) {
  return (
    <Portal>
      <div className="overlay" onClick={onClose}>
        <div
          className="modal modal--wide"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
        <div className="modal__head">
          <div>
            <div className="eyebrow">Registro de solo lectura</div>
            <div className="modal__title">
              Detalle de {resource.singular}
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
          <div className="banner banner--info">
            <Icon name="lock" size={16} className="banner__icon" />
            <span>
              {resource.immutableNote ??
                'Este registro es inmutable y no puede modificarse.'}
            </span>
          </div>

          <dl className="kv">
            {row.id !== undefined && (
              <>
                <dt>Identificador</dt>
                <dd className="mono">{String(row.id)}</dd>
              </>
            )}
            {resource.fields.map((field) => {
              const value = getValue(row, field.name);
              const rel = relatedLabel(resource.key, field.name, row);
              return (
                <FieldRow
                  key={field.name}
                  label={field.label}
                  type={field.type}
                  value={value}
                  relationLabel={rel}
                />
              );
            })}
            {typeof row.createdAt === 'string' && (
              <>
                <dt>Registrado</dt>
                <dd className="mono">{formatDateTime(row.createdAt)}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
        </div>
      </div>
    </Portal>
  );
}

function FieldRow({
  label,
  type,
  value,
  relationLabel,
}: {
  label: string;
  type: string;
  value: unknown;
  relationLabel: string | null;
}) {
  let body;
  if (type === 'json') {
    body = (
      <dd>
        <JsonViewer value={value} />
      </dd>
    );
  } else if (relationLabel) {
    body = <dd>{relationLabel}</dd>;
  } else if (value === null || value === undefined || value === '') {
    body = (
      <dd>
        <span className="faint">—</span>
      </dd>
    );
  } else if (type === 'datetime') {
    body = <dd className="mono">{formatDateTime(value)}</dd>;
  } else if (type === 'boolean') {
    body = (
      <dd>
        <span className={value ? 'chip chip--verde' : 'chip chip--neutral'}>
          {value ? 'Sí' : 'No'}
        </span>
      </dd>
    );
  } else if (type === 'select' || type === 'uuid') {
    body =
      type === 'uuid' ? (
        <dd className="mono">{String(value)}</dd>
      ) : (
        <dd>
          <StatusChip value={value} />
        </dd>
      );
  } else {
    body = <dd>{humanize(String(value))}</dd>;
  }

  return (
    <>
      <dt>{label}</dt>
      {body}
    </>
  );
}
