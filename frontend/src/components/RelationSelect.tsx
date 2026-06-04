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
  dependencyValue,
  excludeId,
}: {
  id: string;
  refDef: RefDef;
  value: string;
  onChange: (value: string) => void;
  /** Valor del campo del que depende esta relación (ver `RefDef.dependsOn`). */
  dependencyValue?: string;
  /**
   * Id que se omite de las opciones (ej. al reasignar, no ofrecer el mismo
   * prestador que se está reemplazando).
   */
  excludeId?: string;
}) {
  const target = resourceByKey(refDef.resource);
  const scoped = Boolean(refDef.dependsOn);
  const depReady = !scoped || Boolean(dependencyValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: scoped
      ? ['relation-options', refDef.resource, 'scoped', dependencyValue ?? '']
      : ['relation-options', refDef.resource],
    queryFn: () => {
      if (scoped) {
        return apiFetch<Row>(refDef.scopedPath!(dependencyValue!)).then(
          (res) =>
            ((res?.[refDef.scopedOptionsKey!] as Row[] | undefined) ?? []),
        );
      }
      return apiFetch<Row[]>(
        `${target?.path ?? ''}?page=1&limit=${RELATION_PAGE_SIZE}`,
      );
    },
    enabled: Boolean(target) && depReady,
  });

  const options = useMemo(
    () =>
      (data ?? []).filter(
        (row) => !excludeId || String(row.id) !== excludeId,
      ),
    [data, excludeId],
  );

  // Si la dependencia cambió y el valor elegido ya no pertenece a las opciones
  // acotadas (ej. cambiaste de persona a cuidar), se limpia la selección.
  useEffect(() => {
    if (!scoped || !value || data === undefined) return;
    if (!options.some((row) => String(row.id) === value)) {
      onChange('');
    }
  }, [scoped, value, data, options, onChange]);

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
    const margin = 8;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    // Se abre HACIA ABAJO por defecto (es lo natural). Sólo se invierte cuando
    // abajo casi no entra ni una opción y arriba hay claramente más lugar.
    const dropUp = spaceBelow < 64 && spaceAbove > spaceBelow;
    // El alto se acota al lugar disponible para no salirse del viewport; si hay
    // más opciones que el alto, el menú scrollea internamente.
    const maxHeight = Math.min(300, Math.max(64, dropUp ? spaceAbove : spaceBelow));
    const base = {
      position: 'fixed' as const,
      left: rect.left,
      width: rect.width,
      maxHeight,
    };
    // Es obligatorio fijar explícitamente el anclaje no usado en `auto`: la
    // clase base `.combo__menu` trae `top: calc(100% + 4px)` y, al anclar por
    // `bottom`, ese `top` heredado quedaría activo y colapsaría el menú.
    setMenuStyle(
      dropUp
        ? { ...base, top: 'auto', bottom: vh - rect.top + gap }
        : { ...base, bottom: 'auto', top: rect.bottom + gap },
    );
  }, []);

  // Recalcula la posición al abrir y la mantiene al hacer scroll/resize
  // (incluido el scroll del cuerpo del modal, capturado en fase de captura).
  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    place();

    // El scroll y el resize pueden dispararse muchas veces por frame (sobre
    // todo el scroll del cuerpo del modal en fase de captura). Se coalescen en
    // un único recálculo por frame con requestAnimationFrame: en lugar de un
    // `getBoundingClientRect` + setState por evento, a lo sumo uno por frame.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };
    // Re-medir en el próximo frame: al abrir, el `autoFocus` del input puede
    // desplazar el scroll y mover el campo; sin esto el menú queda posicionado
    // contra una geometría vieja (a veces fuera de pantalla).
    schedule();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
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

  // Identificadores para enlazar el input (combobox) con su lista de opciones
  // y con la opción activa, de modo que un lector de pantalla anuncie el
  // resaltado al navegar con las flechas (patrón ARIA combobox).
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-opt-${index}`;
  const activeOptionId =
    open && filtered.length > 0 && filtered[active]
      ? optionId(active)
      : undefined;

  // Mantiene la opción resaltada a la vista al recorrer con el teclado: con el
  // tope de 100 registros, sin esto el resaltado se iría fuera del menú.
  useEffect(() => {
    if (!open) return;
    const node = menuRef.current?.querySelector<HTMLElement>(
      `[data-opt="${active}"]`,
    );
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // Relación dependiente sin la dependencia elegida: campo deshabilitado.
  if (scoped && !depReady) {
    return (
      <div className="combo">
        <div className="combo__field is-disabled" aria-disabled="true">
          <span className="combo__current faint">
            Elegí primero la persona a cuidar
          </span>
        </div>
      </div>
    );
  }

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
            // El nombre accesible lo aporta el <label htmlFor={id}> externo;
            // acá sólo declaramos la semántica de combobox y su estado.
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
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
            aria-haspopup="listbox"
            aria-expanded={false}
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
            id={listboxId}
            className="combo__menu combo__menu--floating"
            role="listbox"
            aria-label={`Opciones de ${target?.singular ?? 'registro'}`}
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
                id={optionId(i)}
                data-opt={i}
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
