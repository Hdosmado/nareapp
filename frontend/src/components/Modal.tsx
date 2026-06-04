import {
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Portal } from './Portal';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), ' +
  'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Controles enfocables y visibles dentro del diálogo, en orden de tabulación. */
function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((el) => el.offsetParent !== null);
}

/**
 * Marca el resto de la app (`#root`) como inerte mientras hay un modal abierto:
 * el contenido de fondo deja de ser enfocable y desaparece del árbol de
 * accesibilidad, así un lector de pantalla no se escapa del diálogo (lo que
 * `aria-modal` por sí solo no garantiza en todos los lectores). El modal vive
 * en un `Portal` sobre `<body>`, hermano de `#root`, por lo que queda intacto.
 *
 * Se cuenta cuántos modales hay abiertos para soportar diálogos encadenados
 * (una confirmación sobre un formulario): el fondo sólo se reactiva cuando se
 * cierra el último.
 */
let openModalCount = 0;
function lockBackground() {
  openModalCount += 1;
  if (openModalCount > 1) return;
  const root = document.getElementById('root');
  if (root) {
    root.setAttribute('inert', '');
    root.setAttribute('aria-hidden', 'true');
  }
}
function unlockBackground() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount > 0) return;
  const root = document.getElementById('root');
  if (root) {
    root.removeAttribute('inert');
    root.removeAttribute('aria-hidden');
  }
}

interface ModalProps {
  /** Cierra el modal: Escape, click en el velo o el botón de cerrar. */
  onClose: () => void;
  children: ReactNode;
  /** Modificador de ancho del diálogo: `modal--narrow` | `modal--wide`. */
  className?: string;
  /** `alertdialog` para confirmaciones destructivas; `dialog` por defecto. */
  role?: 'dialog' | 'alertdialog';
  /** Nombre accesible del diálogo (usar `label` o `labelledBy`, no ambos). */
  label?: string;
  labelledBy?: string;
  /** Si se pasa, el contenedor es un `<form>` que envía con esta función. */
  onSubmit?: (event: FormEvent) => void;
  /** Control que recibe el foco al abrir; por defecto, el propio diálogo. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Cerrar al hacer click fuera del diálogo (en el velo). Por defecto, sí. */
  closeOnBackdrop?: boolean;
}

/**
 * Diálogo modal accesible y compartido. Centraliza el comportamiento que todo
 * modal del panel necesita y que antes faltaba o se repetía a mano:
 *
 * - Mueve el foco al diálogo al abrir y lo devuelve al disparador al cerrar.
 * - Atrapa el foco con Tab / Shift+Tab dentro del diálogo: no se escapa al
 *   contenido de fondo.
 * - Cierra con Escape y con click en el velo.
 * - Bloquea el scroll del fondo mientras está abierto.
 *
 * El contenido (`modal__head` / `modal__body` / `modal__foot`) se pasa como
 * hijos; el componente sólo aporta el `Portal`, el velo y el contenedor.
 */
export function Modal({
  onClose,
  children,
  className,
  role = 'dialog',
  label,
  labelledBy,
  onSubmit,
  initialFocusRef,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  // Ref de callback: acepta tanto <form> como <div> sin casteos.
  const setDialog = useCallback((el: HTMLElement | null) => {
    dialogRef.current = el;
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lockBackground();

    // Foco inicial: el control indicado o, por defecto, el propio diálogo
    // (anuncia su nombre accesible y deja el primer Tab en el primer control).
    if (initialFocusRef?.current) initialFocusRef.current.focus();
    else dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      // Reactiva el fondo ANTES de devolverle el foco: `focus()` sobre un árbol
      // todavía inerte no haría nada.
      unlockBackground();
      // Devuelve el foco a quien abrió el modal, si sigue en el documento.
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    // Sólo al montar / desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const items = focusables(dialogRef.current);
    if (items.length === 0) {
      // Sin controles enfocables: el foco se queda en el diálogo.
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === dialogRef.current) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const stop = (event: MouseEvent) => event.stopPropagation();
  const shared = {
    ref: setDialog,
    className: className ? `modal ${className}` : 'modal',
    role,
    'aria-modal': true,
    'aria-label': label,
    'aria-labelledby': labelledBy,
    tabIndex: -1,
    onKeyDown,
    onClick: stop,
  } as const;

  return (
    <Portal>
      <div className="overlay" onClick={closeOnBackdrop ? onClose : undefined}>
        {onSubmit ? (
          <form {...shared} onSubmit={onSubmit}>
            {children}
          </form>
        ) : (
          <div {...shared}>{children}</div>
        )}
      </div>
    </Portal>
  );
}
