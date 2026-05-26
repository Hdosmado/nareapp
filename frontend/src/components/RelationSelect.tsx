/**
 * Selector de relación: combobox buscable que reemplaza el ingreso manual de
 * UUIDs. Carga los registros reales del recurso referenciado y los muestra
 * con una etiqueta legible; hacia la API sigue enviando el `id`.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { getValue, humanize, type Row } from '../lib/format';
import { resourceByKey } from '../resources';
import type { RefDef } from '../lib/refs';
import { Icon } from './Icon';
import { Portal } from './Portal';

/** Tope de registros por página admitido por el backend (`@Max(100)`). */
const RELATION_PAGE_SIZE = 100;

/** Etiqueta principal de una opción a partir de sus claves legibles. */
export function relationLabel(row: Row, labelKeys: string[]): string {
  const parts = labelKeys
    .map((key) => getValue(row, key))
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => humanize(String(v)));
  return parts.length > 0 ? parts.join(' · ') : `Registro ${String(row.id ?? '')}`;
}

export function RelationSelect({
  id,
  refDef,
  value,
  onChange,
}: {
  id: string;
  refDef: RefDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const target = resourceByKey(refDef.resource);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['relation-options', refDef.resource],
    queryFn: () =>
      apiFetch<Row[]>(
        `${target?.path ?? ''}?page=1&limit=${RELATION_PAGE_SIZE}`,
      ),
    enabled: Boolean(target),
  });

  const options = useMemo(() => data ?? [], [data]);

  const selected = useMemo(
    () => options.find((row) => String(row.id) === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((row) => {
      const label = relationLabel(row, refDef.labelKeys).toLowerCase();
      return label.includes(term) || String(row.id).includes(term);
    });
  }, [options, query, refDef.labelKeys]);

  // Posiciona el menú flotante contra el viewport. Se renderiza vía portal en
  // `<body>` para no quedar recortado por `.modal__body { overflow-y: auto }`
  // ni atrapado por el `transform` del modal.
  const place = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(240, (dropUp ? spaceAbove : spaceBelow) - gap - 8),
    );
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, []);

  // Recalcula la posición al abrir y la mantiene al hacer scroll/resize
  // (incluido el scroll del cuerpo del modal, capturado en fase de captura).
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // Cierra el menú al hacer clic fuera (contemplando el menú porteado).
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const node = e.target as Node;
      if (boxRef.current?.contains(node)) return;
      if (menuRef.current?.contains(node)) return;
      setOpen(false);
      setQuery('');
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function choose(row: Row) {
    onChange(String(row.id));
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  const currentLabel = selected
    ? relationLabel(selected, refDef.labelKeys)
    : '';

  return (
    <div className="combo" ref={boxRef}>
      <div
        ref={fieldRef}
        className={`combo__field${open ? ' is-open' : ''}`}
        onClick={() => {
          setOpen(true);
          setActive(0);
        }}
      >
        {open ? (
          <input
            id={id}
            autoFocus
            value={query}
            placeholder={
              currentLabel || `Buscar ${target?.singular ?? 'registro'}…`
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        ) : (
          <span
            className={currentLabel ? 'combo__current' : 'combo__current faint'}
            id={id}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
              }
            }}
          >
            {currentLabel ||
              `Seleccionar ${target?.singular ?? 'registro'}…`}
          </span>
        )}

        {value && !open && (
          <button
            type="button"
            className="combo__clear"
            aria-label="Quitar selección"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
        <Icon name="chevron-down" size={15} className="faint" />
      </div>

      {open && menuStyle && (
        <Portal>
          <div
            ref={menuRef}
            className="combo__menu combo__menu--floating"
            role="listbox"
            style={menuStyle}
          >
            {isLoading && <div className="combo__msg">Cargando opciones…</div>}
            {isError && (
              <div className="combo__msg" style={{ color: 'var(--danger)' }}>
                No se pudieron cargar las opciones.
              </div>
            )}
            {!isLoading && !isError && options.length === 0 && (
              <div className="combo__msg">
                No hay {target?.label.toLowerCase() ?? 'registros'} cargados.
                Creá uno primero en su sección.
              </div>
            )}
            {!isLoading &&
              !isError &&
              options.length > 0 &&
              filtered.length === 0 && (
                <div className="combo__msg">
                  Sin coincidencias para «{query}».
                </div>
              )}
            {filtered.map((row, i) => (
              <div
                key={String(row.id)}
                role="option"
                aria-selected={String(row.id) === value}
                className={`combo__opt${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(row)}
              >
                <b>{relationLabel(row, refDef.labelKeys)}</b>
                <span>{String(row.id).slice(0, 13)}</span>
              </div>
            ))}
          </div>
        </Portal>
      )}
    </div>
  );
}
