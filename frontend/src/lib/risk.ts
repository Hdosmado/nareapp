/**
 * Semáforo de riesgo: fuente única de verdad de los tonos para JavaScript.
 *
 * Los markers de Leaflet (`divIcon`, que inyecta HTML) y los SVG inline no
 * pueden leer las variables CSS `--risk-*`, así que las espejan acá con los
 * MISMOS valores que `global.css` (tema claro). Estos puntos se dibujan
 * siempre sobre superficies claras (tiles de OpenStreetMap, popups blancos),
 * por lo que el tono del tema claro es el correcto en ambos temas de la app.
 *
 * Antes había tres copias divergentes de estos colores (el mapa operativo
 * usaba tonos más saturados que los chips). Toda lectura de color de riesgo en
 * JS pasa ahora por acá. Si cambian los tokens `--risk-*` en global.css,
 * actualizar estos valores también.
 */

export type RiskLevel = 'verde' | 'amarillo' | 'naranja' | 'rojo';

/** Color pleno de cada nivel del semáforo (espejo de `--risk-*`, tema claro). */
export const RISK_COLOR: Record<RiskLevel, string> = {
  verde: '#15803d',
  amarillo: '#a16207',
  naranja: '#c2410c',
  rojo: '#b91c1c',
};

/**
 * Tono neutro para puntos de rutina sin carga de riesgo (espejo de
 * `--ink-faint`). Es la contraparte cromática de `.semaforo--neutral`: ni
 * acción (coral) ni estado de riesgo, sólo un dato operativo en reposo.
 */
export const NEUTRAL_TONE = '#6f6557';

/** Normaliza un valor crudo a un nivel del semáforo; por defecto, verde. */
export function normalizeRiskLevel(raw: unknown): RiskLevel {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'amarillo' || value === 'naranja' || value === 'rojo') {
    return value;
  }
  return 'verde';
}
