import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { AssignmentStatus, RiskLevel, ServiceStatus } from '../../common/enums';
import { argentinaDayRangeUtc } from '../../common/timezone.util';
import { PatientAddress } from '../patients/entities/patient-address.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Provider } from '../providers/entities/provider.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { ServiceAssignment } from './entities/service-assignment.entity';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly services: Repository<Service>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    @InjectRepository(PatientAddress)
    private readonly addresses: Repository<PatientAddress>,
  ) {}

  /** Crea un servicio a cubrir. La ciudad/provincia se toman del domicilio. */
  async createService(dto: CreateServiceDto): Promise<Service> {
    const patient = await this.patients.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Persona a cuidar no encontrada');
    }
    const address = await this.addresses.findOne({
      where: { id: dto.addressId },
    });
    if (!address) {
      throw new NotFoundException('Domicilio no encontrado');
    }

    return this.services.save(
      this.services.create({
        patient,
        address,
        fecha: dto.fecha,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        ciudad: address.ciudad,
        provincia: address.provincia,
        estado: ServiceStatus.PENDIENTE,
      }),
    );
  }

  /** Asigna un prestador a un servicio, creando la asignación operativa. */
  async createAssignment(dto: CreateAssignmentDto): Promise<ServiceAssignment> {
    const service = await this.services.findOne({
      where: { id: dto.serviceId },
      relations: { patient: true, address: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    const provider = await this.providers.findOne({
      where: { id: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    const assignment = await this.assignments.save(
      this.assignments.create({
        service,
        provider,
        patient: service.patient,
        address: service.address,
        startTime: service.startTime,
        endTime: service.endTime,
        city: service.ciudad,
        province: service.provincia,
        status: AssignmentStatus.PENDIENTE,
        riskLevel: RiskLevel.VERDE,
      }),
    );

    service.estado = ServiceStatus.ASIGNADO;
    await this.services.save(service);
    return assignment;
  }

  /** Asignaciones del prestador para el día de hoy (zona horaria Argentina). */
  getTodayForProvider(providerId: string): Promise<ServiceAssignment[]> {
    const { start, end } = argentinaDayRangeUtc();
    return this.assignments.find({
      where: {
        provider: { id: providerId },
        startTime: Between(start, end),
      },
      relations: { patient: true, address: true },
      order: { startTime: 'ASC' },
    });
  }

  /** Servicio actual o próximo del prestador (el primero aún no cerrado). */
  getCurrentForProvider(
    providerId: string,
  ): Promise<ServiceAssignment | null> {
    return this.assignments.findOne({
      where: {
        provider: { id: providerId },
        status: Not(
          In([
            AssignmentStatus.FINALIZADO,
            AssignmentStatus.CANCELADO,
            AssignmentStatus.AUSENTE,
          ]),
        ),
      },
      relations: { patient: true, address: true },
      order: { startTime: 'ASC' },
    });
  }

  /** Asignaciones de hoy para el panel, con filtros opcionales. */
  getTodayForCoordination(
    query: QueryServicesDto,
  ): Promise<ServiceAssignment[]> {
    const { start, end } = argentinaDayRangeUtc();
    const where: FindOptionsWhere<ServiceAssignment> = {
      startTime: Between(start, end),
    };
    if (query.city) {
      where.city = query.city;
    }
    if (query.province) {
      where.province = query.province;
    }
    if (query.status) {
      where.status = query.status;
    }
    return this.assignments.find({
      where,
      relations: { patient: true, address: true, provider: true },
      order: { startTime: 'ASC' },
    });
  }

  /** Asignaciones de hoy en riesgo (amarillo, naranja o rojo). */
  getRiskForCoordination(): Promise<ServiceAssignment[]> {
    const { start, end } = argentinaDayRangeUtc();
    return this.assignments.find({
      where: {
        startTime: Between(start, end),
        riskLevel: In([RiskLevel.AMARILLO, RiskLevel.NARANJA, RiskLevel.ROJO]),
      },
      relations: { patient: true, address: true, provider: true },
      order: { startTime: 'ASC' },
    });
  }

  async findAssignment(id: string): Promise<ServiceAssignment> {
    const assignment = await this.assignments.findOne({
      where: { id },
      relations: {
        patient: true,
        address: true,
        provider: true,
        service: true,
      },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    return assignment;
  }
}
