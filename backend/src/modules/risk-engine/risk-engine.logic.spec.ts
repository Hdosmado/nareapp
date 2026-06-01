import {
  AlertSeverity,
  AlertType,
  AssignmentStatus,
  RiskLevel,
} from '../../common/enums';
import {
  decideInServiceRisk,
  decideRisk,
  InServiceInputs,
  RiskInputs,
  RiskThresholds,
} from './risk-engine.logic';

/**
 * Umbrales del set base de pruebas pre-servicio. `leadMin: 45` reproduce el
 * comportamiento histórico (se esperaba señal en toda la ventana de 45 min),
 * de modo que las reglas clásicas siguen valiendo. El gating con lead corto se
 * prueba aparte más abajo.
 */
const thresholds: RiskThresholds = {
  observationLead: 45,
  yellowLead: 30,
  orangeLead: 15,
  tolerance: 10,
  signalStaleMin: 12,
  farDistanceM: 3000,
  leadMin: 45,
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

describe('decideRisk — lead de tracking corto (lead_min = 10)', () => {
  // Con el tracking arrancando recién 10 min antes, la ausencia de señal entre
  // los 30 y los 10 min NO debe generar alerta (todavía no se espera GPS).
  const shortLead: RiskThresholds = { ...thresholds, leadMin: 10 };

  it('25 min antes sin señal: próximo y verde, sin falsa alerta de "sin señal"', () => {
    const d = decideRisk(
      inputs({ minutesToStart: 25, hasFreshSignal: false }),
      shortLead,
    );
    expect(d.status).toBe(AssignmentStatus.PROXIMO);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alert).toBeNull();
  });

  it('12 min antes sin señal (aún fuera del lead): en camino y verde, sin alerta', () => {
    const d = decideRisk(
      inputs({ minutesToStart: 12, hasFreshSignal: false }),
      shortLead,
    );
    expect(d.status).toBe(AssignmentStatus.EN_CAMINO);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alert).toBeNull();
  });

  it('8 min antes sin señal (ya dentro del lead): alerta naranja app_sin_conexion', () => {
    const d = decideRisk(
      inputs({ minutesToStart: 8, hasFreshSignal: false }),
      shortLead,
    );
    expect(d.status).toBe(AssignmentStatus.EN_RIESGO);
    expect(d.riskLevel).toBe(RiskLevel.NARANJA);
    expect(d.alert?.type).toBe(AlertType.APP_SIN_CONEXION);
  });

  it('hora vencida sin "LLEGUÉ": la regla de tiempo sigue valiendo aunque no haya señal', () => {
    const d = decideRisk(
      inputs({ minutesToStart: -5, hasFreshSignal: false }),
      shortLead,
    );
    expect(d.status).toBe(AssignmentStatus.DEMORADO);
    expect(d.alert?.type).toBe(AlertType.INICIO_VENCIDO);
  });
});

describe('decideInServiceRisk — tramo en servicio', () => {
  function svc(overrides: Partial<InServiceInputs>): InServiceInputs {
    return {
      minutesSinceCheckIn: 30,
      hasFreshServiceSignal: true,
      insideGeofence: true,
      locationPermissionAlways: true,
      ...overrides,
    };
  }

  it('dentro del radio, con señal y permiso "Siempre": verde, sin alertas', () => {
    const d = decideInServiceRisk(svc({}), thresholds);
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alerts).toHaveLength(0);
  });

  it('último latido fuera del radio: SALIO_DURANTE_SERVICIO (alta) y rojo', () => {
    const d = decideInServiceRisk(svc({ insideGeofence: false }), thresholds);
    expect(d.riskLevel).toBe(RiskLevel.ROJO);
    expect(d.alerts.map((a) => a.type)).toContain(
      AlertType.SALIO_DURANTE_SERVICIO,
    );
    expect(d.alerts[0].severity).toBe(AlertSeverity.ALTA);
  });

  it('sin latido reciente pasado el margen: SIN_SENAL_EN_SERVICIO (alta) y naranja', () => {
    const d = decideInServiceRisk(
      svc({ hasFreshServiceSignal: false, minutesSinceCheckIn: 20 }),
      thresholds,
    );
    expect(d.riskLevel).toBe(RiskLevel.NARANJA);
    expect(d.alerts.map((a) => a.type)).toContain(
      AlertType.SIN_SENAL_EN_SERVICIO,
    );
  });

  it('sin señal pero dentro del margen tras "LLEGUÉ": todavía sin alerta', () => {
    const d = decideInServiceRisk(
      svc({ hasFreshServiceSignal: false, minutesSinceCheckIn: 5 }),
      thresholds,
    );
    expect(d.riskLevel).toBe(RiskLevel.VERDE);
    expect(d.alerts).toHaveLength(0);
  });

  it('permiso ya no es "Siempre": SIN_PERMISO_UBICACION (alta) y naranja', () => {
    const d = decideInServiceRisk(
      svc({ locationPermissionAlways: false }),
      thresholds,
    );
    expect(d.riskLevel).toBe(RiskLevel.NARANJA);
    expect(d.alerts.map((a) => a.type)).toContain(
      AlertType.SIN_PERMISO_UBICACION,
    );
  });

  it('permiso desconocido (null): no evalúa el permiso', () => {
    const d = decideInServiceRisk(
      svc({ locationPermissionAlways: null }),
      thresholds,
    );
    expect(d.alerts.map((a) => a.type)).not.toContain(
      AlertType.SIN_PERMISO_UBICACION,
    );
  });

  it('sin latido en servicio todavía (insideGeofence null): no marca salida', () => {
    const d = decideInServiceRisk(
      svc({ insideGeofence: null, minutesSinceCheckIn: 3 }),
      thresholds,
    );
    expect(d.alerts.map((a) => a.type)).not.toContain(
      AlertType.SALIO_DURANTE_SERVICIO,
    );
  });

  it('salida + sin permiso a la vez: ambas alertas, prevalece rojo', () => {
    const d = decideInServiceRisk(
      svc({ insideGeofence: false, locationPermissionAlways: false }),
      thresholds,
    );
    expect(d.riskLevel).toBe(RiskLevel.ROJO);
    expect(d.alerts).toHaveLength(2);
  });
});
