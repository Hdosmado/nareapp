import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../lib/api';
import { getValue, humanize, type Row } from '../lib/format';
import { resourceByKey, type FieldDef } from '../resources';
import { DataTable } from '../components/DataTable';
import { EntityFormModal } from '../components/EntityFormModal';
import { RecordViewModal } from '../components/RecordViewModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DeviceManagerModal } from '../components/DeviceManagerModal';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, TableSkeleton } from '../components/states';
import { useToast } from '../components/ToastProvider';

const LIMIT = 20;

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; row: Row }
  | { mode: 'view'; row: Row }
  | null;

function capitalize(text: string): string {
  return humanize(text.charAt(0).toUpperCase() + text.slice(1));
}

/** Campo que representa el estado del recurso (para filtros rápidos). */
function statusFieldOf(fields: FieldDef[]): FieldDef | undefined {
  return fields.find(
    (f) =>
      f.options &&
      (f.name === 'status' || f.name === 'estado' || f.name === 'severity'),
  );
}

/** Página genérica de listado + CRUD para cualquier entidad del backoffice. */
export function EntityListPage({ resourceKey }: { resourceKey: string }) {
  const resource = resourceByKey(resourceKey);
  const notify = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(
    searchParams.get('status') ?? '',
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deviceProvider, setDeviceProvider] = useState<Row | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [resourceKey, page],
    queryFn: () =>
      apiFetch<Row[]>(`${resource?.path ?? ''}?page=${page}&limit=${LIMIT}`),
    enabled: Boolean(resource),
  });

  const rows = useMemo(() => data ?? [], [data]);
  const statusField = useMemo(
    () => (resource ? statusFieldOf(resource.fields) : undefined),
    [resource],
  );

  const filtered = useMemo(() => {
    if (!resource) return rows;
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && statusField) {
        const current = getValue(row, statusField.name);
        if (String(current ?? '') !== status) return false;
      }
      if (!term) return true;
      return resource.searchKeys.some((key) => {
        const value = getValue(row, key);
        return value != null && String(value).toLowerCase().includes(term);
      });
    });
  }, [rows, search, status, statusField, resource]);

  if (!resource) {
    return (
      <div className="page">
        <EmptyState
          icon="alert"
          title="Sección no encontrada"
          text="La sección solicitada no existe en el panel."
        />
      </div>
    );
  }

  const isReadonly = Boolean(resource.readonly);

  function refresh(message: string) {
    notify(message);
    void queryClient.invalidateQueries({ queryKey: [resourceKey] });
  }

  /** Acción al hacer clic en una fila, según el tipo de recurso. */
  function onRowClick(row: Row) {
    if (resource!.key === 'services') {
      navigate(`/servicio/${String(row.id)}`);
    } else if (isReadonly) {
      setModal({ mode: 'view', row });
    } else {
      setModal({ mode: 'edit', row });
    }
  }

  async function onConfirmDelete() {
    if (!confirm || !resource) return;
    setDeleting(true);
    try {
      await apiFetch(`${resource.path}/${String(confirm.id)}`, {
        method: 'DELETE',
      });
      setConfirm(null);
      refresh(`${capitalize(resource.singular)} eliminado.`);
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
          <h1 className="pagehead__title">{resource.label}</h1>
          <p className="pagehead__desc">{resource.description}</p>
        </div>
        <div className="pagehead__actions">
          {!isReadonly && (
            <button
              className="btn btn--primary"
              onClick={() => setModal({ mode: 'create' })}
            >
              <Icon name="plus" size={16} />
              Nuevo {resource.singular}
            </button>
          )}
        </div>
      </div>

      {isReadonly && (
        <div className="banner banner--info">
          <Icon name="lock" size={16} className="banner__icon" />
          <span>
            {resource.immutableNote ??
              'Entidad inmutable: este panel sólo permite consultarla.'}
          </span>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <span className="icon-lead">
            <Icon name="search" size={16} />
          </span>
          <input
            placeholder={`Buscar en ${resource.label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="toolbar__count">{filtered.length} en pantalla</span>
      </div>

      {statusField && (
        <div className="filterbar" style={{ marginBottom: 'var(--sp-4)' }}>
          <button
            className={`chipfilter${status === '' ? ' is-active' : ''}`}
            onClick={() => setStatus('')}
          >
            Todos
          </button>
          {statusField.options?.map((opt) => (
            <button
              key={opt}
              className={`chipfilter${status === opt ? ' is-active' : ''}`}
              onClick={() => setStatus(status === opt ? '' : opt)}
            >
              {humanize(opt)}
            </button>
          ))}
        </div>
      )}

      {isLoading && <TableSkeleton cols={resource.columns.length} />}

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={resource.icon}
          title={`No hay ${resource.label.toLowerCase()} para mostrar`}
          text={
            search || status
              ? 'Ningún registro coincide con el filtro aplicado.'
              : isReadonly
                ? 'Todavía no se registraron eventos de este tipo.'
                : `Usá «Nuevo ${resource.singular}» para crear el primero.`
          }
          action={
            !isReadonly && !search && !status ? (
              <button
                className="btn btn--primary"
                onClick={() => setModal({ mode: 'create' })}
              >
                <Icon name="plus" size={16} />
                Nuevo {resource.singular}
              </button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <DataTable
            columns={resource.columns}
            rows={filtered}
            onRowClick={onRowClick}
            onEdit={
              isReadonly || resource.key === 'services'
                ? undefined
                : (row) => setModal({ mode: 'edit', row })
            }
            onDelete={isReadonly ? undefined : (row) => setConfirm(row)}
            extraActions={
              resource.key === 'providers'
                ? [
                    {
                      icon: 'phone',
                      title: 'Dispositivo',
                      onClick: (row) => setDeviceProvider(row),
                    },
                  ]
                : undefined
            }
          />
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
              disabled={rows.length < LIMIT}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <Icon name="chevron-right" size={15} />
            </button>
          </div>
        </>
      )}

      {modal?.mode === 'view' && (
        <RecordViewModal
          resource={resource}
          row={modal.row}
          onClose={() => setModal(null)}
        />
      )}

      {(modal?.mode === 'create' || modal?.mode === 'edit') && (
        <EntityFormModal
          resource={resource}
          mode={modal.mode}
          source={modal.mode === 'edit' ? modal.row : null}
          onClose={() => setModal(null)}
          onSaved={(message) => {
            setModal(null);
            refresh(message);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={`Eliminar ${resource.singular}`}
          message={`Esta acción borra el registro de forma permanente. ¿Confirmás eliminar este ${resource.singular}?`}
          busy={deleting}
          onConfirm={onConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {deviceProvider && (
        <DeviceManagerModal
          provider={deviceProvider}
          onClose={() => setDeviceProvider(null)}
        />
      )}
    </div>
  );
}
