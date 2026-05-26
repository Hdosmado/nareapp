import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renderiza su contenido directamente en `<body>`, fuera del árbol de la
 * página. Así los elementos `position: fixed` (overlays, menús flotantes) se
 * miden contra el viewport y nunca quedan atrapados por un ancestro con
 * `transform`, `filter` o `backdrop-filter`, que de otro modo pasaría a ser
 * su bloque contenedor.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
