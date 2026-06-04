import type { ColumnDef } from '../resources';
import { formatDateTime, getValue, humanize, type Row } from '../lib/format';
import { onActivate } from '../lib/a11y';
import { Icon, type IconName } from './Icon';
import { StatusChip } from './StatusChip';

/** Acción extra por fila, además de editar y eliminar. */
export interface RowAction {
  icon: IconName;
  title: string;
  onClick: (row: Row) => void;
}

function renderCell(row: Row, column: ColumnDef) {
  const value = getValue(row, column.key);

  switch (column.kind) {
    case 'chip':
      return <StatusChip value={value} />;
    case 'datetime':
      return <span className="cell-mono">{formatDateTime(value)}</span>;
    case 'mono':
      return (
        <span className="cell-mono">
          {value === null || value === undefined || value === ''
            ? '—'
            : String(value)}
        </span>
      );
    case 'bool':
      return (
        <span className={value ? 'chip chip--verde' : 'chip chip--neutral'}>
          {value ? 'Sí' : 'No'}
        </span>
      );
    case 'strong':
      return <span className="cell-strong">{display(value)}</span>;
    default:
      return <span>{display(value)}</span>;
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return humanize(value);
  return String(value);
}

/** Nombre accesible de la fila: el valor legible de su primera columna. */
function rowLabel(row: Row, columns: ColumnDef[]): string {
  const value = columns[0] ? getValue(row, columns[0].key) : undefined;
  if (value === null || value === undefined || value === '') return 'registro';
  return typeof value === 'string' ? humanize(value) : String(value);
}

/**
 * Tabla genérica del backoffice. Si recibe `onEdit`/`onDelete` muestra la
 * columna de acciones; si no, es una tabla consultable (entidades inmutables).
 */
export function DataTable({
  columns,
  rows,
  onRowClick,
  onEdit,
  onDelete,
  extraActions = [],
}: {
  columns: ColumnDef[];
  rows: Row[];
  onRowClick: (row: Row) => void;
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  extraActions?: RowAction[];
}) {
  const hasActions = Boolean(onEdit || onDelete || extraActions.length > 0);

  return (
    <div className="tablecard">
      <div className="tablescroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {hasActions && <th className="col-actions">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={String(row.id ?? index)}
                className="is-clickable"
                tabIndex={0}
                aria-label={`Ver detalle: ${rowLabel(row, columns)}`}
                onClick={() => onRowClick(row)}
                onKeyDown={onActivate(() => onRowClick(row))}
              >
                {columns.map((c) => (
                  <td key={c.key}>{renderCell(row, c)}</td>
                ))}
                {hasActions && (
                  <td className="col-actions">
                    <div className="rowactions">
                      {extraActions.map((action) => (
                        <button
                          key={action.title}
                          className="btn btn--ghost btn--sm btn--icon"
                          aria-label={action.title}
                          title={action.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                          }}
                        >
                          <Icon name={action.icon} size={15} />
                        </button>
                      ))}
                      {onEdit && (
                        <button
                          className="btn btn--ghost btn--sm btn--icon"
                          aria-label="Editar"
                          title="Editar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
                          }}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="btn btn--ghost btn--sm btn--icon"
                          aria-label="Eliminar"
                          title="Eliminar"
                          style={{ color: 'var(--danger)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(row);
                          }}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
