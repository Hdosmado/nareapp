/**
 * Presentación de las acciones de coordinación: traduce el enum crudo del
 * backend al lenguaje operativo (verbo + objeto, en pasado) y asigna el tono
 * del punto de la bitácora.
 *
 * El color es sobrio por diseño y respeta «el riesgo manda la jerarquía»: las
 * acciones de rutina van en neutro, las que resuelven o estabilizan la
 * cobertura en verde, y la única escalación (marcar que requiere reemplazo) en
 * naranja. La voz de acción del panel queda reservada al enlace a la ficha.
 */

type ActionTone = 'neutral' | 'verde' | 'naranja';

interface ActionCopy {
  /** Título de la acción en lenguaje de coordinación: verbo + objeto, en pasado. */
  label: string;
  /** Tono del punto en la bitácora (neutro / verde / naranja). */
  tone: ActionTone;
}

/** Copia y tono por tipo de acción. El orden define el del filtro. */
const ACTION_COPY: Record<string, ActionCopy> = {
  asignar_reemplazo: { label: 'Asignó un reemplazo', tone: 'verde' },
  marcar_contactado: { label: 'Marcó contactado', tone: 'verde' },
  resolver_alerta: { label: 'Resolvió una alerta', tone: 'verde' },
  aprobar_excepcion: { label: 'Aprobó una excepción', tone: 'verde' },
  llamar_prestador: { label: 'Llamó al prestador', tone: 'neutral' },
  enviar_notificacion: { label: 'Envió una notificación', tone: 'neutral' },
  marcar_reemplazo_requerido: {
    label: 'Marcó que requiere reemplazo',
    tone: 'naranja',
  },
};

/** Tipos de acción conocidos, en orden, para poblar el filtro. */
export const ACTION_TYPES = Object.keys(ACTION_COPY);

/** Título legible de un tipo de acción. */
export function actionLabel(type: string): string {
  return ACTION_COPY[type]?.label ?? type.replace(/_/g, ' ');
}

/** Tono del punto de la bitácora para un tipo de acción. */
export function actionTone(type: string): ActionTone {
  return ACTION_COPY[type]?.tone ?? 'neutral';
}
