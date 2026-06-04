import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';
import { Portal } from './Portal';

type ToastKind = 'ok' | 'error';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(
  () => undefined,
);

/** Provee notificaciones efímeras (esquina inferior derecha). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {/* Porteado a <body>: queda fuera de `#root`, así un toast se sigue
          anunciando aunque haya un modal abierto (que vuelve `#root` inerte). */}
      <Portal>
        <div className="toasts">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={t.kind === 'error' ? 'toast toast--error' : 'toast'}
              // Los errores interrumpen al lector (assertive); las
              // confirmaciones esperan su turno (polite). Cada toast lleva su
              // propia región viva: así el rol correcto acompaña a su contenido.
              role={t.kind === 'error' ? 'alert' : 'status'}
              aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
            >
              <span className="toast__icon">
                <Icon name={t.kind === 'error' ? 'alert' : 'check'} size={17} />
              </span>
              {t.message}
            </div>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, kind?: ToastKind) => void {
  return useContext(ToastContext);
}
