/** Parámetro operativo configurable con su valor por defecto. */
export interface ConfigDefault {
  key: string;
  value: string;
  type: 'number' | 'string' | 'boolean';
  description: string;
}

/**
 * Parámetros sembrados en la tabla `app_config` al iniciar la aplicación.
 * Ajustables sin desplegar código. Alimentan al motor de riesgo y a la app.
 */
export const CONFIG_DEFAULTS: ConfigDefault[] = [
  {
    key: 'risk.observation_lead_min',
    value: '45',
    type: 'number',
    description: 'Minutos antes del inicio en que comienza la observación',
  },
  {
    key: 'risk.yellow_lead_min',
    value: '30',
    type: 'number',
    description: 'Umbral de alerta amarilla (minutos antes del inicio)',
  },
  {
    key: 'risk.orange_lead_min',
    value: '15',
    type: 'number',
    description: 'Umbral de alerta naranja (minutos antes del inicio)',
  },
  {
    key: 'risk.tolerance_min',
    value: '10',
    type: 'number',
    description: 'Margen tras la hora de inicio antes de marcar ausencia probable',
  },
  {
    key: 'risk.signal_stale_min',
    value: '12',
    type: 'number',
    description: 'Minutos sin ubicación nueva para considerar que no hay señal',
  },
  {
    key: 'risk.far_distance_m',
    value: '3000',
    type: 'number',
    description: 'Distancia al domicilio considerada lejana cerca del inicio',
  },
  {
    key: 'tracking.lead_min',
    value: '45',
    type: 'number',
    description: 'Minutos antes del inicio en que la app activa el tracking',
  },
  {
    key: 'tracking.interval_sec',
    value: '600',
    type: 'number',
    description: 'Frecuencia de muestreo de ubicación, en segundos',
  },
  {
    key: 'tracking.max_window_min',
    value: '90',
    type: 'number',
    description: 'Ventana máxima de tracking previo al servicio',
  },
  {
    key: 'geofence.radius_m',
    value: '150',
    type: 'number',
    description: 'Radio de geocerca por defecto para validar la llegada',
  },
];
