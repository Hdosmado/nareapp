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
    if (!inputs.hasFreshSignal) {
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
    if (!inputs.hasFreshSignal) {
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
