import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertSeverity,
  AlertType,
  AssignmentStatus,
  LocationPermission,
  RiskLevel,
} from '../../common/enums';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/app-config.service';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import { RiskEngineService } from './risk-engine.service';

/** Valores de config sembrados, para el mock de AppConfigService. */
const CONFIG: Record<string, number> = {
  'risk.observation_lead_min': 45,
  'risk.yellow_lead_min': 30,
  'risk.orange_lead_min': 15,
  'risk.tolerance_min': 10,
  'risk.signal_stale_min': 12,
  'risk.far_distance_m': 3000,
  'tracking.lead_min': 10,
  'tracking.trail_min': 10,
};

describe('RiskEngineService — evaluación del tramo en servicio', () => {
  let service: RiskEngineService;
  let assignments: jest.Mocked<Repository<ServiceAssignment>>;
  let locations: jest.Mocked<Repository<PreServiceLocationEvent>>;
  let alerts: { raiseAlert: jest.Mock };
  let audit: { record: jest.Mock };

  const now = new Date('2026-05-29T13:00:00Z');

  /** Asignación en curso: "LLEGUÉ" hace 1 h, fin en 30 min. */
  function inServiceAssignment(): ServiceAssignment {
    return {
      id: 'asg-1',
      status: AssignmentStatus.EN_SERVICIO,
      riskLevel: RiskLevel.VERDE,
      checkInAt: new Date(now.getTime() - 60 * 60_000),
      checkOutAt: null,
      endTime: new Date(now.getTime() + 30 * 60_000),
      address: { latitude: -32.95, longitude: -60.66, allowedRadiusM: 150 },
      provider: { id: 'prov-1' },
    } as unknown as ServiceAssignment;
  }

  beforeEach(async () => {
    assignments = {
      find: jest.fn(),
      save: jest.fn((x) => Promise.resolve(x)),
    } as unknown as jest.Mocked<Repository<ServiceAssignment>>;
    locations = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<PreServiceLocationEvent>>;
    alerts = { raiseAlert: jest.fn() };
    audit = { record: jest.fn() };

    const config = {
      getNumber: (key: string, fallback = 0) => CONFIG[key] ?? fallback,
    } as unknown as AppConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        RiskEngineService,
        { provide: getRepositoryToken(ServiceAssignment), useValue: assignments },
        { provide: getRepositoryToken(PreServiceLocationEvent), useValue: locations },
        { provide: AppConfigService, useValue: config },
        { provide: AlertsService, useValue: alerts },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(RiskEngineService);
    // Sin candidatos pre-servicio; un candidato en servicio.
    assignments.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([inServiceAssignment()]);
  });

  it('último latido fuera del radio: levanta SALIO_DURANTE_SERVICIO y pasa a rojo', async () => {
    locations.findOne.mockResolvedValue({
      insideGeofence: false,
      locationPermission: LocationPermission.SIEMPRE,
      timestampServer: new Date(now.getTime() - 2 * 60_000),
    } as PreServiceLocationEvent);

    await service.runEvaluation(now);

    expect(alerts.raiseAlert).toHaveBeenCalledWith(
      'asg-1',
      AlertType.SALIO_DURANTE_SERVICIO,
      AlertSeverity.ALTA,
    );
    expect(assignments.save).toHaveBeenCalledWith(
      expect.objectContaining({ riskLevel: RiskLevel.ROJO }),
    );
  });

  it('sin latido en servicio pasado el margen: levanta SIN_SENAL_EN_SERVICIO', async () => {
    locations.findOne.mockResolvedValue(null);

    await service.runEvaluation(now);

    expect(alerts.raiseAlert).toHaveBeenCalledWith(
      'asg-1',
      AlertType.SIN_SENAL_EN_SERVICIO,
      AlertSeverity.ALTA,
    );
  });

  it('permiso ya no es "Siempre": levanta SIN_PERMISO_UBICACION', async () => {
    locations.findOne.mockResolvedValue({
      insideGeofence: true,
      locationPermission: LocationPermission.DURANTE_USO,
      timestampServer: new Date(now.getTime() - 1 * 60_000),
    } as PreServiceLocationEvent);

    await service.runEvaluation(now);

    expect(alerts.raiseAlert).toHaveBeenCalledWith(
      'asg-1',
      AlertType.SIN_PERMISO_UBICACION,
      AlertSeverity.ALTA,
    );
  });

  it('todo en orden (dentro, con señal, permiso Siempre): no levanta alertas', async () => {
    locations.findOne.mockResolvedValue({
      insideGeofence: true,
      locationPermission: LocationPermission.SIEMPRE,
      timestampServer: new Date(now.getTime() - 1 * 60_000),
    } as PreServiceLocationEvent);

    await service.runEvaluation(now);

    expect(alerts.raiseAlert).not.toHaveBeenCalled();
  });
});
