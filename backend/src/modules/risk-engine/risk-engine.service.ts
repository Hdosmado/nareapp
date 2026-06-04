import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Repository } from 'typeorm';
import {
  AlertSeverity,
  AlertType,
  AssignmentStatus,
  LocationPermission,
  RiskLevel,
} from '../../common/enums';
import { distanceMeters } from '../../common/geo/geo.util';
import { diffMinutes } from '../../common/timezone.util';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/app-config.service';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import {
  decideInServiceRisk,
  decideRisk,
  InServiceInputs,
  RiskInputs,
  RiskThresholds,
} from './risk-engine.logic';

/** Origen que etiqueta los latidos del tramo en servicio. */
const EN_SERVICIO_ORIGIN = 'en_servicio';

/**
 * Lee, de forma defensiva, la marca de ubicación simulada (`isMocked`) que la
 * app adjunta al latido. La columna se persiste en el evento de ubicación; el
 * acceso tolerante evita acoplarse a su presencia en el tipo y trata cualquier
 * valor que no sea explícitamente `true` como "no simulado".
 */
function isMockedBeat(event: PreServiceLocationEvent): boolean {
  return (event as { isMocked?: boolean | null }).isMocked === true;
}

/**
 * Umbrales del control de presencia CONTINUA en el tramo en servicio. Se
 * cargan de `app_config` (con defaults) y endurecen la regla anti-fraude: no
 * basta con un único latido dentro del radio.
 */
interface InServicePresenceConfig {
  /** Ventana hacia atrás (minutos) sobre la que se exige presencia continua. */
  windowMin: number;
  /** Fracción mínima de latidos válidos dentro del radio (0..1). */
  minInsidePct: number;
  /** Hueco máximo (minutos) entre latidos antes de tratarlo como abandono. */
  maxGapMin: number;
  /** Precisión máxima aceptable (metros); peor que esto no cuenta como presencia. */
  maxAccuracyM: number;
  /** Margen tras el fin (minutos) antes de marcar el servicio sin cierre. */
  graceMin: number;
}

/** Resumen de los latidos válidos del servicio dentro de la ventana. */
interface PresenceSummary {
  /** Latidos considerados (dentro de la ventana). */
  total: number;
  /** Latidos válidos (no simulados y con precisión aceptable). */
  valid: number;
  /** Latidos válidos que cayeron dentro del radio del domicilio. */
  insideValid: number;
  /** Hubo al menos un latido simulado dentro de la ventana. */
  hadMocked: boolean;
  /** Hueco más grande (minutos) entre latidos consecutivos / hasta ahora. */
  maxGapMin: number;
  /** Antigüedad (minutos) del último latido válido; null si no hubo. */
  lastValidAgeMin: number | null;
}

/**
 * Motor de riesgo operativo. Cada minuto evalúa las asignaciones próximas,
 * actualiza su estado y nivel de riesgo, y genera alertas. Es autoritativo del
 * lado del servidor: no depende de la entrega de notificaciones push.
 */
@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(PreServiceLocationEvent)
    private readonly locations: Repository<PreServiceLocationEvent>,
    private readonly config: AppConfigService,
    private readonly alerts: AlertsService,
    private readonly audit: AuditService,
  ) {}

  /** Evaluación periódica del riesgo (una pasada por minuto). */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledEvaluation(): Promise<void> {
    try {
      const count = await this.runEvaluation();
      if (count > 0) {
        this.logger.log(`Riesgo evaluado en ${count} asignación(es)`);
      }
    } catch (error) {
      this.logger.error(
        'Falló la evaluación de riesgo',
        (error as Error)?.stack,
      );
    }
  }

  /** Ejecuta una pasada de evaluación. Devuelve cuántas asignaciones procesó. */
  async runEvaluation(now: Date = new Date()): Promise<number> {
    const thresholds = this.loadThresholds();
    const windowEnd = new Date(
      now.getTime() + (thresholds.observationLead + 5) * 60_000,
    );
    const windowStart = new Date(now.getTime() - 180 * 60_000);

    // Tramo previo al servicio (la ventana clásica del motor de riesgo).
    const candidates = await this.assignments.find({
      where: {
        startTime: Between(windowStart, windowEnd),
        status: In([
          AssignmentStatus.PENDIENTE,
          AssignmentStatus.PROXIMO,
          AssignmentStatus.EN_RIESGO,
          AssignmentStatus.EN_CAMINO,
          AssignmentStatus.DEMORADO,
        ]),
      },
      // `originalAssignment` distingue a un reemplazo, para darle gracia desde
      // su asignación y no marcarlo como ausencia por heredar el inicio vencido.
      relations: { address: true, provider: true, originalAssignment: true },
    });

    for (const assignment of candidates) {
      await this.evaluateOne(assignment, now, thresholds);
    }

    // Tramo "en servicio": asignaciones con "LLEGUÉ" confirmado y sin cierre.
    const trailMin = this.config.getNumber('tracking.trail_min', 10);
    const presence = this.loadPresenceConfig(thresholds, trailMin);
    const inService = await this.assignments.find({
      where: {
        status: AssignmentStatus.EN_SERVICIO,
        checkOutAt: IsNull(),
      },
      relations: { address: true, provider: true },
    });

    for (const assignment of inService) {
      await this.evaluateInServiceOne(assignment, now, thresholds, presence);
    }

    return candidates.length + inService.length;
  }

  private async evaluateOne(
    assignment: ServiceAssignment,
    now: Date,
    thresholds: RiskThresholds,
  ): Promise<void> {
    if (assignment.checkInAt) {
      return;
    }

    const lastLocation = await this.locations.findOne({
      where: { assignment: { id: assignment.id } },
      order: { timestampServer: 'DESC' },
    });

    const inputs = this.buildInputs(assignment, lastLocation, now, thresholds);
    const decision = decideRisk(inputs, thresholds);

    const statusChanged =
      assignment.status !== decision.status ||
      assignment.riskLevel !== decision.riskLevel;

    assignment.status = decision.status;
    assignment.riskLevel = decision.riskLevel;
    if (decision.replacementRequired) {
      assignment.replacementRequired = true;
    }
    await this.assignments.save(assignment);

    if (decision.alert) {
      await this.alerts.raiseAlert(
        assignment.id,
        decision.alert.type,
        decision.alert.severity,
      );
    }

    if (statusChanged) {
      await this.audit.record({
        actorType: 'system',
        entity: 'service_assignment',
        entityId: assignment.id,
        action: 'risk_evaluation',
        diff: { status: decision.status, riskLevel: decision.riskLevel },
      });
    }
  }

  /**
   * Evalúa una asignación EN SERVICIO (tras "LLEGUÉ", hasta el fin + trail).
   * No cambia el estado en el camino feliz (sigue EN_SERVICIO): sólo ajusta el
   * nivel de riesgo y levanta alertas operativas para coordinación.
   *
   * Dos reglas duras complementan el control:
   *  - H13: pasado el fin + margen (grace) sin check-out, levanta
   *    `SERVICIO_SIN_CIERRE` y deja la asignación en revisión (riesgo rojo).
   *    Esta verificación corre ANTES de cualquier salida temprana.
   *  - M6: la presencia se exige de forma CONTINUA (porcentaje de latidos
   *    válidos dentro del radio + detección de huecos), no con el último latido.
   */
  private async evaluateInServiceOne(
    assignment: ServiceAssignment,
    now: Date,
    thresholds: RiskThresholds,
    presence: InServicePresenceConfig,
  ): Promise<void> {
    if (!assignment.checkInAt || assignment.checkOutAt) {
      return;
    }

    // H13 — regla terminal: la asignación quedó EN_SERVICIO pasado el fin +
    // margen sin que el prestador cerrara. Posible abandono o cierre olvidado.
    // Se evalúa PRIMERO para que la salida temprana de "fuera de ventana" no la
    // saltee nunca.
    const graceEnd = new Date(
      assignment.endTime.getTime() + presence.graceMin * 60_000,
    );
    if (now > graceEnd) {
      await this.raiseServicioSinCierre(assignment, now);
      return;
    }

    // Dentro de la ventana de tracking (fin + trail): se exige presencia
    // continua. Se traen TODOS los latidos en servicio de la ventana, no sólo
    // el último, para no validar el servicio con un único ping dentro del radio.
    const windowStart = new Date(now.getTime() - presence.windowMin * 60_000);
    // El piso de la ventana nunca es anterior al "LLEGUÉ".
    const presenceStart =
      assignment.checkInAt > windowStart ? assignment.checkInAt : windowStart;

    const lastService = await this.locations.findOne({
      where: {
        assignment: { id: assignment.id },
        origin: EN_SERVICIO_ORIGIN,
      },
      order: { timestampServer: 'DESC' },
    });

    const beats = await this.findServiceBeats(
      assignment.id,
      presenceStart,
      now,
      lastService,
    );

    const summary = this.summarizePresence(
      beats,
      presence,
      presenceStart,
      now,
    );

    const inputs = this.buildInServiceInputs(
      assignment,
      lastService,
      summary,
      now,
      thresholds,
      presence,
    );
    const decision = decideInServiceRisk(inputs, thresholds);

    // Alertas adicionales que no derivan del último latido sino de la presencia
    // continua / huecos detectados sobre toda la ventana (M6).
    const extraAlerts = this.continuousPresenceAlerts(
      assignment,
      summary,
      presence,
      now,
    );
    const allAlerts = [...decision.alerts, ...extraAlerts.alerts];

    // El nivel de riesgo es el peor entre la decisión base y las reglas de
    // presencia continua (un hueco / ausencia prolongada escala a rojo).
    const riskLevel = this.maxRisk(decision.riskLevel, extraAlerts.riskLevel);

    const riskChanged = assignment.riskLevel !== riskLevel;
    if (riskChanged) {
      assignment.riskLevel = riskLevel;
      await this.assignments.save(assignment);
      await this.audit.record({
        actorType: 'system',
        entity: 'service_assignment',
        entityId: assignment.id,
        action: 'risk_evaluation_en_servicio',
        diff: { riskLevel },
      });
    }

    // Dedupe por tipo: `raiseAlert` reutiliza la alerta abierta del mismo tipo.
    const seen = new Set<AlertType>();
    for (const alert of allAlerts) {
      if (seen.has(alert.type)) continue;
      seen.add(alert.type);
      await this.alerts.raiseAlert(assignment.id, alert.type, alert.severity);
    }
  }

  /**
   * Regla terminal H13. Levanta `SERVICIO_SIN_CIERRE` (alta) y deja la
   * asignación en revisión (riesgo rojo). `raiseAlert` deduplica por tipo, así
   * que no spamea aunque el cron vuelva a pasar cada minuto.
   */
  private async raiseServicioSinCierre(
    assignment: ServiceAssignment,
    now: Date,
  ): Promise<void> {
    if (assignment.riskLevel !== RiskLevel.ROJO) {
      assignment.riskLevel = RiskLevel.ROJO;
      await this.assignments.save(assignment);
      await this.audit.record({
        actorType: 'system',
        entity: 'service_assignment',
        entityId: assignment.id,
        action: 'risk_servicio_sin_cierre',
        diff: { riskLevel: RiskLevel.ROJO, reason: 'sin_checkout_post_fin' },
      });
    }
    await this.alerts.raiseAlert(
      assignment.id,
      AlertType.SERVICIO_SIN_CIERRE,
      AlertSeverity.ALTA,
    );
  }

  /**
   * Trae todos los latidos en servicio de la ventana, ordenados ascendente.
   * Si el repositorio no expone `find` (p.ej. un mock acotado), degrada al
   * último latido conocido para no romper el flujo.
   */
  private async findServiceBeats(
    assignmentId: string,
    windowStart: Date,
    now: Date,
    lastService: PreServiceLocationEvent | null,
  ): Promise<PreServiceLocationEvent[]> {
    if (typeof this.locations.find === 'function') {
      return this.locations.find({
        where: {
          assignment: { id: assignmentId },
          origin: EN_SERVICIO_ORIGIN,
          timestampServer: Between(windowStart, now),
        },
        order: { timestampServer: 'ASC' },
      });
    }
    return lastService ? [lastService] : [];
  }

  /**
   * Resume los latidos en servicio de la ventana: cuántos son válidos (no
   * simulados y con precisión aceptable), cuántos cayeron dentro del radio, el
   * hueco más grande entre latidos y si hubo algún latido simulado. Un latido
   * simulado o con mala precisión NO cuenta como presencia.
   */
  private summarizePresence(
    beats: PreServiceLocationEvent[],
    presence: InServicePresenceConfig,
    windowStart: Date,
    now: Date,
  ): PresenceSummary {
    let valid = 0;
    let insideValid = 0;
    let hadMocked = false;
    let lastValidAgeMin: number | null = null;

    // El hueco se mide sobre los latidos VÁLIDOS consecutivos: un latido
    // simulado / impreciso no "tapa" un hueco de presencia real. El borde
    // inicial de la ventana NO cuenta como hueco (es un artefacto del recorte),
    // sólo los huecos entre latidos y el hueco final hasta ahora.
    let prevValidTs: Date | null = null;
    let maxGapMin = 0;

    for (const beat of beats) {
      const mocked = isMockedBeat(beat);
      if (mocked) {
        hadMocked = true;
      }
      const badAccuracy =
        beat.accuracy != null && beat.accuracy > presence.maxAccuracyM;
      const validBeat = !mocked && !badAccuracy;
      if (!validBeat) {
        continue;
      }
      valid += 1;
      if (prevValidTs !== null) {
        const gap = diffMinutes(beat.timestampServer, prevValidTs);
        if (gap > maxGapMin) {
          maxGapMin = gap;
        }
      }
      prevValidTs = beat.timestampServer;
      lastValidAgeMin = diffMinutes(now, beat.timestampServer);
      if (beat.insideGeofence === true) {
        insideValid += 1;
      }
    }

    // Hueco final: desde el último latido válido hasta ahora. Si no hubo ningún
    // latido válido en la ventana, se mide desde el inicio de la ventana (la
    // ausencia total de señal también es un hueco).
    const tailGap = diffMinutes(now, prevValidTs ?? windowStart);
    if (tailGap > maxGapMin) {
      maxGapMin = tailGap;
    }

    return {
      total: beats.length,
      valid,
      insideValid,
      hadMocked,
      maxGapMin,
      lastValidAgeMin,
    };
  }

  /**
   * Reglas de presencia CONTINUA (M6) que no dependen del último latido:
   *  - Hueco de latidos válidos mayor al máximo configurado -> abandono probable.
   *  - Ausencia total de latidos válidos pasado el margen inicial.
   *  - Fracción de latidos dentro del radio por debajo del mínimo exigido.
   * Devuelve las alertas y el peor nivel de riesgo asociado.
   */
  private continuousPresenceAlerts(
    assignment: ServiceAssignment,
    summary: PresenceSummary,
    presence: InServicePresenceConfig,
    now: Date,
  ): { alerts: { type: AlertType; severity: AlertSeverity }[]; riskLevel: RiskLevel } {
    const alerts: { type: AlertType; severity: AlertSeverity }[] = [];
    let riskLevel = RiskLevel.VERDE;

    const minutesSinceCheckIn = assignment.checkInAt
      ? diffMinutes(now, assignment.checkInAt)
      : 0;
    // Se da un margen tras el "LLEGUÉ" antes de exigir el primer latido válido.
    const pastInitialGrace = minutesSinceCheckIn > presence.maxGapMin;

    // Hueco de latidos válidos demasiado grande durante el servicio: tratamos la
    // ausencia prolongada como evento de riesgo, no como "sin novedad = OK".
    if (pastInitialGrace && summary.maxGapMin > presence.maxGapMin) {
      alerts.push({
        type: AlertType.SIN_SENAL_EN_SERVICIO,
        severity: AlertSeverity.ALTA,
      });
      riskLevel = this.maxRisk(riskLevel, RiskLevel.NARANJA);
    }

    // Presencia continua insuficiente: con latidos válidos pero fracción dentro
    // del radio por debajo del mínimo, se considera salida durante el servicio.
    if (summary.valid > 0) {
      const insidePct = summary.insideValid / summary.valid;
      if (insidePct < presence.minInsidePct) {
        alerts.push({
          type: AlertType.SALIO_DURANTE_SERVICIO,
          severity: AlertSeverity.ALTA,
        });
        riskLevel = this.maxRisk(riskLevel, RiskLevel.ROJO);
      }
    }

    // Ubicación simulada durante el servicio: señal fuerte de fraude. No se
    // confía en el teléfono — un latido `isMocked` escala el tramo a rojo (se
    // reutiliza SALIO_DURANTE_SERVICIO, la alerta más fuerte del tramo).
    if (summary.hadMocked) {
      alerts.push({
        type: AlertType.SALIO_DURANTE_SERVICIO,
        severity: AlertSeverity.ALTA,
      });
      riskLevel = this.maxRisk(riskLevel, RiskLevel.ROJO);
    }

    return { alerts, riskLevel };
  }

  /** Devuelve el peor de dos niveles de riesgo según la escala del dominio. */
  private maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
    const order: Record<RiskLevel, number> = {
      [RiskLevel.VERDE]: 0,
      [RiskLevel.AMARILLO]: 1,
      [RiskLevel.NARANJA]: 2,
      [RiskLevel.ROJO]: 3,
    };
    return order[a] >= order[b] ? a : b;
  }

  private buildInServiceInputs(
    assignment: ServiceAssignment,
    lastService: PreServiceLocationEvent | null,
    summary: PresenceSummary,
    now: Date,
    thresholds: RiskThresholds,
    presence: InServicePresenceConfig,
  ): InServiceInputs {
    let hasFreshServiceSignal = false;
    let insideGeofence: boolean | null = null;
    let locationPermissionAlways: boolean | null = null;

    if (lastService) {
      // Un último latido simulado / impreciso NO acredita señal fresca: el
      // prestador podría estar falseando la ubicación.
      const lastValid =
        !isMockedBeat(lastService) &&
        !(
          lastService.accuracy != null &&
          lastService.accuracy > presence.maxAccuracyM
        );
      const ageMinutes = diffMinutes(now, lastService.timestampServer);
      hasFreshServiceSignal = lastValid && ageMinutes <= thresholds.signalStaleMin;
      // La señal fresca se respalda en la ventana: si el último latido válido es
      // viejo, no la damos por fresca aunque el último registro sea reciente.
      if (
        summary.lastValidAgeMin === null ||
        summary.lastValidAgeMin > thresholds.signalStaleMin
      ) {
        hasFreshServiceSignal = false;
      }
      insideGeofence = lastValid ? lastService.insideGeofence : null;
      if (lastService.locationPermission != null) {
        locationPermissionAlways =
          lastService.locationPermission === LocationPermission.SIEMPRE;
      }
    }

    return {
      minutesSinceCheckIn: assignment.checkInAt
        ? diffMinutes(now, assignment.checkInAt)
        : 0,
      hasFreshServiceSignal,
      insideGeofence,
      locationPermissionAlways,
    };
  }

  /** Carga los umbrales del control de presencia continua del tramo en servicio. */
  private loadPresenceConfig(
    thresholds: RiskThresholds,
    trailMin: number,
  ): InServicePresenceConfig {
    return {
      windowMin: this.config.getNumber('risk.in_service_window_min', 30),
      minInsidePct: this.config.getNumber('risk.presence_min_pct', 0.6),
      maxGapMin: this.config.getNumber(
        'risk.signal_gap_min',
        thresholds.signalStaleMin * 2,
      ),
      maxAccuracyM: this.config.getNumber('risk.accuracy_max_m', 100),
      graceMin: this.config.getNumber('risk.close_grace_min', trailMin),
    };
  }

  private buildInputs(
    assignment: ServiceAssignment,
    lastLocation: PreServiceLocationEvent | null,
    now: Date,
    thresholds: RiskThresholds,
  ): RiskInputs {
    let hasFreshSignal = false;
    let distanceToAddress: number | null = null;

    if (lastLocation) {
      const ageMinutes = diffMinutes(now, lastLocation.timestampServer);
      hasFreshSignal = ageMinutes <= thresholds.signalStaleMin;
      const address = assignment.address;
      if (address?.latitude != null && address?.longitude != null) {
        distanceToAddress = distanceMeters(
          lastLocation.latitude,
          lastLocation.longitude,
          address.latitude,
          address.longitude,
        );
      }
    }

    // Un reemplazo (tiene `originalAssignment`) goza de una ventana de gracia
    // contada desde su asignación (`createdAt`): mientras no la supere, no se lo
    // escala por inicio vencido ni ausencia aunque herede un `startTime` vencido.
    const isReplacement = Boolean(assignment.originalAssignment);
    const replacementGraceActive =
      isReplacement &&
      assignment.createdAt != null &&
      diffMinutes(now, assignment.createdAt) < thresholds.replacementGraceMin;

    return {
      minutesToStart: diffMinutes(assignment.startTime, now),
      hasCheckIn: Boolean(assignment.checkInAt),
      hasFreshSignal,
      hasAnySignal: Boolean(lastLocation),
      distanceToAddress,
      replacementGraceActive,
    };
  }

  private loadThresholds(): RiskThresholds {
    return {
      observationLead: this.config.getNumber('risk.observation_lead_min', 45),
      yellowLead: this.config.getNumber('risk.yellow_lead_min', 30),
      orangeLead: this.config.getNumber('risk.orange_lead_min', 15),
      tolerance: this.config.getNumber('risk.tolerance_min', 10),
      signalStaleMin: this.config.getNumber('risk.signal_stale_min', 12),
      farDistanceM: this.config.getNumber('risk.far_distance_m', 3000),
      leadMin: this.config.getNumber('tracking.lead_min', 10),
      replacementGraceMin: this.config.getNumber('risk.replacement_grace_min', 20),
    };
  }
}
