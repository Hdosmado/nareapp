import {
  AlertSeverity,
  AlertType,
  AssignmentStatus,
  RiskLevel,
} from '../../common/enums';

/** Umbrales configurables que gobiernan el algoritmo de riesgo. */
export interface RiskThresholds {
  observationLead: number;
  yellowLead: number;
  orangeLead: number;
  tolerance: number;
  signalStaleMin: number;
  farDistanceM: number;
  /**
   * Minutos antes del inicio en que la app arranca el tracking
   * (`tracking.lead_min`). Antes de esa marca todavía no se espera señal, así
   * que la ausencia de GPS no genera alerta (evita falsos positivos cuando el
   * lead de tracking es corto).
   */
  leadMin: number;
}

/** Variables de entrada para evaluar el riesgo de una asignación. */
export interface RiskInputs {
  /** Minutos hasta el inicio del servicio (negativo si ya pasó). */
  minutesToStart: number;
  hasCheckIn: boolean;
  hasFreshSignal: boolean;
  hasAnySignal: boolean;
  distanceToAddress: number | null;
}

export interface RiskAlert {
  type: AlertType;
  severity: AlertSeverity;
}

/** Resultado de evaluar el riesgo: estado, nivel y alerta a generar. */
export interface RiskDecision {
  status: AssignmentStatus;
  riskLevel: RiskLevel;
  replacementRequired: boolean;
  alert: RiskAlert | null;
}

/**
 * Algoritmo operativo de riesgo. Reglas deterministas y auditables — sin IA.
 * Cada decisión es trazable a un umbral configurable:
 *
 *  - 45 min antes: comienza la observación.
 *  - 30 min antes: sin señal -> alerta amarilla.
 *  - 15 min antes: lejos o sin señal -> alerta naranja.
 *  - hora de inicio: sin "LLEGUÉ" -> alerta roja.
 *  - pasada la tolerancia: ausencia probable / requiere reemplazo.
 */
export function decideRisk(
  inputs: RiskInputs,
  thresholds: RiskThresholds,
): RiskDecision {
  const plain = (
    status: AssignmentStatus,
    riskLevel: RiskLevel,
  ): RiskDecision => ({ status, riskLevel, replacementRequired: false, alert: null });

  // La señal de GPS recién se espera cuando arrancó la ventana de tracking
  // (`leadMin` antes del inicio). Antes de eso, "sin señal" no es alerta.
  const signalExpected = inputs.minutesToStart <= thresholds.leadMin;

  // Fuera de la ventana de observación: todavía no se evalúa.
  if (inputs.minutesToStart > thresholds.observationLead) {
    return plain(AssignmentStatus.PENDIENTE, RiskLevel.VERDE);
  }

  // Pasó la hora de inicio más la tolerancia, sin "LLEGUÉ": ausencia probable.
  if (inputs.minutesToStart <= -thresholds.tolerance) {
    return {
      status: AssignmentStatus.AUSENTE_PROBABLE,
      riskLevel: RiskLevel.ROJO,
      replacementRequired: true,
      alert: {
        type: AlertType.AUSENCIA_PROBABLE,
        severity: AlertSeverity.CRITICA,
      },
    };
  }

  // Pasó la hora de inicio, sin "LLEGUÉ": inicio vencido.
  if (inputs.minutesToStart <= 0) {
    return {
      status: AssignmentStatus.DEMORADO,
      riskLevel: RiskLevel.ROJO,
      replacementRequired: false,
      alert: { type: AlertType.INICIO_VENCIDO, severity: AlertSeverity.ALTA },
    };
  }

  // Ventana naranja: faltan hasta 15 minutos.
  if (inputs.minutesToStart <= thresholds.orangeLead) {
    if (
      inputs.distanceToAddress !== null &&
      inputs.distanceToAddress > thresholds.farDistanceM
    ) {
      return {
        status: AssignmentStatus.DEMORADO,
        riskLevel: RiskLevel.NARANJA,
        replacementRequired: false,
        alert: { type: AlertType.LEJOS_15, severity: AlertSeverity.ALTA },
      };
    }
    if (signalExpected && !inputs.hasFreshSignal) {
      return {
        status: AssignmentStatus.EN_RIESGO,
        riskLevel: RiskLevel.NARANJA,
        replacementRequired: false,
        alert: {
          type: AlertType.APP_SIN_CONEXION,
          severity: AlertSeverity.ALTA,
        },
      };
    }
    return plain(AssignmentStatus.EN_CAMINO, RiskLevel.VERDE);
  }

  // Ventana amarilla: faltan hasta 30 minutos.
  if (inputs.minutesToStart <= thresholds.yellowLead) {
    if (signalExpected && !inputs.hasFreshSignal) {
      return {
        status: AssignmentStatus.EN_RIESGO,
        riskLevel: RiskLevel.AMARILLO,
        replacementRequired: false,
        alert: { type: AlertType.SIN_SENAL_30, severity: AlertSeverity.MEDIA },
      };
    }
    return plain(AssignmentStatus.PROXIMO, RiskLevel.VERDE);
  }

  // Observación iniciada (faltan hasta 45 minutos): sin alerta todavía.
  return plain(AssignmentStatus.PROXIMO, RiskLevel.VERDE);
}

/**
 * Variables del tramo "en servicio": desde el "LLEGUÉ" hasta el fin + trail.
 * El control anti-fraude se apoya en el latido de ubicación y el permiso
 * reportados por la app.
 */
export interface InServiceInputs {
  /** Minutos transcurridos desde el "LLEGUÉ". */
  minutesSinceCheckIn: number;
  /** Hay un latido en servicio reciente (antigüedad <= signalStaleMin). */
  hasFreshServiceSignal: boolean;
  /**
   * El último latido en servicio cae dentro del radio del domicilio.
   * `null` cuando todavía no hubo latido en servicio o el domicilio no tiene
   * coordenadas (en ese caso no se evalúa la salida del radio).
   */
  insideGeofence: boolean | null;
  /**
   * El permiso de ubicación reportado es "Siempre". `null` cuando es
   * desconocido (no se evalúa el permiso en ese caso).
   */
  locationPermissionAlways: boolean | null;
}

/** Resultado del tramo en servicio: nivel de riesgo y alertas a generar. */
export interface InServiceDecision {
  riskLevel: RiskLevel;
  alerts: RiskAlert[];
}

/**
 * Reglas del tramo "en servicio". No cambian el estado de la asignación
 * (sigue `EN_SERVICIO`): el anti-fraude es operativo — coordinación ve la
 * alerta y actúa. Puede devolver varias alertas a la vez.
 *
 *  - salió del radio del domicilio -> `SALIO_DURANTE_SERVICIO` (rojo).
 *  - sin latido pasado el margen    -> `SIN_SENAL_EN_SERVICIO` (naranja).
 *  - permiso ya no es "Siempre"     -> `SIN_PERMISO_UBICACION` (naranja).
 */
export function decideInServiceRisk(
  inputs: InServiceInputs,
  thresholds: RiskThresholds,
): InServiceDecision {
  const alerts: RiskAlert[] = [];

  if (inputs.insideGeofence === false) {
    alerts.push({
      type: AlertType.SALIO_DURANTE_SERVICIO,
      severity: AlertSeverity.ALTA,
    });
  }

  // Se da un margen tras el "LLEGUÉ" antes de exigir el primer latido.
  if (
    inputs.minutesSinceCheckIn > thresholds.signalStaleMin &&
    !inputs.hasFreshServiceSignal
  ) {
    alerts.push({
      type: AlertType.SIN_SENAL_EN_SERVICIO,
      severity: AlertSeverity.ALTA,
    });
  }

  if (inputs.locationPermissionAlways === false) {
    alerts.push({
      type: AlertType.SIN_PERMISO_UBICACION,
      severity: AlertSeverity.ALTA,
    });
  }

  let riskLevel = RiskLevel.VERDE;
  if (alerts.some((a) => a.type === AlertType.SALIO_DURANTE_SERVICIO)) {
    riskLevel = RiskLevel.ROJO;
  } else if (alerts.length > 0) {
    riskLevel = RiskLevel.NARANJA;
  }

  return { riskLevel, alerts };
}
