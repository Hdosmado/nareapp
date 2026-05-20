import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { AssignmentStatus } from '../../common/enums';
import { distanceMeters } from '../../common/geo/geo.util';
import { diffMinutes } from '../../common/timezone.util';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/app-config.service';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import { decideRisk, RiskInputs, RiskThresholds } from './risk-engine.logic';

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
      relations: { address: true, provider: true },
    });

    for (const assignment of candidates) {
      await this.evaluateOne(assignment, now, thresholds);
    }
    return candidates.length;
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

    return {
      minutesToStart: diffMinutes(assignment.startTime, now),
      hasCheckIn: Boolean(assignment.checkInAt),
      hasFreshSignal,
      hasAnySignal: Boolean(lastLocation),
      distanceToAddress,
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
    };
  }
}
