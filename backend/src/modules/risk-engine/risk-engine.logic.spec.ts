import {
  AlertSeverity,
  AlertType,
  AssignmentStatus,
  RiskLevel,
} from '../../common/enums';
import { decideRisk, RiskInputs, RiskThresholds } from './risk-engine.logic';

/** Umbrales estándar usados en las pruebas (coinciden con los valores sembrados). */
const thresholds: RiskThresholds = {
  observationLead: 45,
  yellowLead: 30,
  orangeLead: 15,
  tolerance: 10,
  signalStaleMin: 12,
  farDistanceM: 3000,
};

/** Construye un set de inputs partiendo de un caso base sin riesgo. */
function inputs(overrides: Partial<RiskInputs>): RiskInputs {
  return {
    minutesToStart: 60,
    hasCheckIn: false,
    hasFreshSignal: false,
    hasAnySignal: false,
    distanceToAddress: null,
    ...overrides,
  };
}

describe('decideRisk — motor de riesgo operativo', () => {
  it('fuera de la ventana de observación (> 45 min): pendiente y verde', () => {
    const d = decideRisk(inputs({ minutesToStart: 60 }), thresholds);
    expect(d.status).toBe(AssignmentStatus.PENDIENTE);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alert).toBeNull();
  });

  it('observación iniciada (entre 45 y 30 min): próximo y verde', () => {
    const d = decideRisk(inputs({ minutesToStart: 40 }), thresholds);
    expect(d.status).toBe(AssignmentStatus.PROXIMO);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alert).toBeNull();
  });

  it('30 min antes sin señal GPS: alerta amarilla sin_senal_30', () => {
    const d = decideRisk(
      inputs({ minutesToStart: 25, hasFreshSignal: false }),
      thresholds,
    );
    expect(d.status).toBe(AssignmentStatus.EN_RIESGO);
    expect(d.riskLevel).toBe(RiskLevel.AMARILLO);
    expect(d.alert?.type).toBe(AlertType.SIN_SENAL_30);
    expect(d.alert?.severity).toBe(AlertSeverity.MEDIA);
  });

  it('30 min antes con señal fresca: próximo y verde, sin alerta', () => {
    const d = decideRisk(
      inputs({ minutesToStart: 25, hasFreshSignal: true, hasAnySignal: true }),
      thresholds,
    );
    expect(d.status).toBe(AssignmentStatus.PROXIMO);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alert).toBeNull();
  });

  it('15 min antes y lejos del domicilio: alerta naranja lejos_15', () => {
    const d = decideRisk(
      inputs({
        minutesToStart: 10,
        hasFreshSignal: true,
        hasAnySignal: true,
        distanceToAddress: 5000,
      }),
      thresholds,
    );
    expect(d.status).toBe(AssignmentStatus.DEMORADO);
    expect(d.riskLevel).toBe(RiskLevel.NARANJA);
    expect(d.alert?.type).toBe(AlertType.LEJOS_15);
  });

  it('15 min antes sin señal: alerta naranja app_sin_conexion', () => {
    const d = decideRisk(
      inputs({ minutesToStart: 10, hasFreshSignal: false }),
      thresholds,
    );
    expect(d.status).toBe(AssignmentStatus.EN_RIESGO);
    expect(d.riskLevel).toBe(RiskLevel.NARANJA);
    expect(d.alert?.type).toBe(AlertType.APP_SIN_CONEXION);
  });

  it('15 min antes, con señal y cerca: en camino y verde', () => {
    const d = decideRisk(
      inputs({
        minutesToStart: 10,
        hasFreshSignal: true,
        hasAnySignal: true,
        distanceToAddress: 800,
      }),
      thresholds,
    );
    expect(d.status).toBe(AssignmentStatus.EN_CAMINO);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alert).toBeNull();
  });

  it('hora de inicio vencida sin "LLEGUÉ": alerta roja inicio_vencido', () => {
    const d = decideRisk(inputs({ minutesToStart: -5 }), thresholds);
    expect(d.status).toBe(AssignmentStatus.DEMORADO);
    expect(d.riskLevel).toBe(RiskLevel.ROJO);
    expect(d.alert?.type).toBe(AlertType.INICIO_VENCIDO);
  });

  it('pasada la tolerancia sin "LLEGUÉ": ausencia probable y requiere reemplazo', () => {
    const d = decideRisk(inputs({ minutesToStart: -15 }), thresholds);
    expect(d.status).toBe(AssignmentStatus.AUSENTE_PROBABLE);
    expect(d.riskLevel).toBe(RiskLevel.ROJO);
    expect(d.replacementRequired).toBe(true);
    expect(d.alert?.type).toBe(AlertType.AUSENCIA_PROBABLE);
    expect(d.alert?.severity).toBe(AlertSeverity.CRITICA);
  });
});
