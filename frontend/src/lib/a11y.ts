import type { KeyboardEvent } from 'react';

/**
 * Devuelve un manejador `onKeyDown` que activa `handler` con Enter o Espacio,
 * para elementos que no son botones nativos (p. ej. una fila de tabla
 * clickeable). Previene el scroll que el Espacio dispara por defecto.
 *
 * Sólo actúa cuando la tecla se pulsa sobre el propio elemento, no sobre un
 * control anidado (un botón de la fila): así Enter/Espacio en «Editar» o
 * «Eliminar» los maneja ese botón, no la fila.
 */
export function onActivate(handler: () => void) {
  return (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  };
}
