import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentStatus } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientAddress } from '../patients/entities/patient-address.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Provider } from '../providers/entities/provider.entity';
import { ServiceAssignment } from './entities/service-assignment.entity';
import { Service } from './entities/service.entity';
import { ServicesService } from './services.service';

/**
 * Pruebas de las notificaciones nuevas en el ciclo de la asignación:
 *  - alta (createAssignment) -> "nueva_asignacion".
 *  - cancelación (updateAssignment a CANCELADO) -> "asignacion_cancelada".
 */
describe('ServicesService — notificaciones de asignación', () => {
  let service: ServicesService;
  let services: jest.Mocked<Repository<Service>>;
  let assignments: jest.Mocked<Repository<ServiceAssignment>>;
  let providers: jest.Mocked<Repository<Provider>>;
  let notifications: { notifyProvider: jest.Mock };

  beforeEach(async () => {
    services = {
      findOne: jest.fn(),
      save: jest.fn((x) => Promise.resolve(x)),
    } as unknown as jest.Mocked<Repository<Service>>;
    assignments = {
      findOne: jest.fn(),
      create: jest.fn((x) => x as ServiceAssignment),
      save: jest.fn((x) => Promise.resolve({ id: 'asg-1', ...x })),
    } as unknown as jest.Mocked<Repository<ServiceAssignment>>;
    providers = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Provider>>;
    notifications = { notifyProvider: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useValue: services },
        { provide: getRepositoryToken(ServiceAssignment), useValue: assignments },
        { provide: getRepositoryToken(Provider), useValue: providers },
        { provide: getRepositoryToken(Patient), useValue: {} },
        { provide: getRepositoryToken(PatientAddress), useValue: {} },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(ServicesService);
  });

  it('createAssignment notifica "nueva_asignacion" al prestador', async () => {
    services.findOne.mockResolvedValue({
      id: 'svc-1',
      patient: { id: 'pat-1' },
      address: { id: 'addr-1' },
      startTime: new Date('2026-05-29T12:00:00Z'),
      endTime: new Date('2026-05-29T16:00:00Z'),
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
    } as unknown as Service);
    providers.findOne.mockResolvedValue({ id: 'prov-1' } as Provider);

    await service.createAssignment({ serviceId: 'svc-1', providerId: 'prov-1' });

    expect(notifications.notifyProvider).toHaveBeenCalledWith(
      'prov-1',
      'nueva_asignacion',
      expect.objectContaining({ assignmentId: 'asg-1' }),
      'asg-1',
    );
  });

  it('updateAssignment a CANCELADO notifica "asignacion_cancelada" al prestador', async () => {
    assignments.findOne.mockResolvedValue({
      id: 'asg-1',
      status: AssignmentStatus.PROXIMO,
      provider: { id: 'prov-1' },
    } as unknown as ServiceAssignment);

    await service.updateAssignment('asg-1', {
      status: AssignmentStatus.CANCELADO,
    });

    expect(notifications.notifyProvider).toHaveBeenCalledWith(
      'prov-1',
      'asignacion_cancelada',
      expect.objectContaining({ assignmentId: 'asg-1' }),
      'asg-1',
    );
  });

  it('updateAssignment sin cambio de estado no notifica cancelación', async () => {
    assignments.findOne.mockResolvedValue({
      id: 'asg-1',
      status: AssignmentStatus.EN_SERVICIO,
      provider: { id: 'prov-1' },
    } as unknown as ServiceAssignment);

    await service.updateAssignment('asg-1', { replacementRequired: true });

    expect(notifications.notifyProvider).not.toHaveBeenCalled();
  });

  it('updateAssignment ya CANCELADO no reenvía la notificación', async () => {
    assignments.findOne.mockResolvedValue({
      id: 'asg-1',
      status: AssignmentStatus.CANCELADO,
      provider: { id: 'prov-1' },
    } as unknown as ServiceAssignment);

    await service.updateAssignment('asg-1', {
      status: AssignmentStatus.CANCELADO,
    });

    expect(notifications.notifyProvider).not.toHaveBeenCalled();
  });
});
