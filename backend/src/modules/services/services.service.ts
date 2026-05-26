import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { AssignmentStatus, RiskLevel, ServiceStatus } from '../../common/enums';
import { ARGENTINA_TZ, argentinaDayRangeUtc } from '../../common/timezone.util';
import { PatientAddress } from '../patients/entities/patient-address.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Provider } from '../providers/entities/provider.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import {
  FranjaHoraria,
  QueryServicesDto,
} from './dto/query-services.dto';
import { ServiceAssignment } from './entities/service-assignment.entity';
import { Service } from './entities/service.entity';

/** Rango horario [desde, hasta) en hora local Argentina por franja. */
const FRANJA_HORAS: Record<FranjaHoraria, [number, number]> = {
  [FranjaHoraria.MADRUGADA]: [0, 6],
  [FranjaHoraria.MANANA]: [6, 12],
  [FranjaHoraria.TARDE]: [12, 18],
  [FranjaHoraria.NOCHE]: [18, 24],
};

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

  /**
   * Asignaciones de hoy (hora Argentina) para el panel.
   * Filtros opcionales: city, province, status, franja horaria.
   */
  getTodayForCoordination(
    query: QueryServicesDto,
  ): Promise<ServiceAssignment[]> {
    const { start, end } = argentinaDayRangeUtc();
    const qb = this.assignments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.provider', 'provider')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.address', 'address')
      .where('a.start_time BETWEEN :start AND :end', { start, end })
      .orderBy('a.start_time', 'ASC');

    if (query.city) {
      qb.andWhere('LOWER(a.city) = LOWER(:city)', { city: query.city });
    }
    if (query.province) {
      qb.andWhere('LOWER(a.province) = LOWER(:province)', {
        province: query.province,
      });
    }
    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }
    if (query.franja) {
      const [from, to] = FRANJA_HORAS[query.franja];
      qb.andWhere(
        `EXTRACT(HOUR FROM (a.start_time AT TIME ZONE :tz)) >= :hourFrom
         AND EXTRACT(HOUR FROM (a.start_time AT TIME ZONE :tz)) < :hourTo`,
        { tz: ARGENTINA_TZ, hourFrom: from, hourTo: to },
      );
    }

    return qb.getMany();
  }

  /**
   * Asignaciones en riesgo (riskLevel != verde), sin límite de día.
   * Ordenadas por severidad (rojo > naranja > amarillo) y, como segundo
   * criterio, por proximidad temporal al ahora (`|now - startTime|` ASC).
   *
   * "Proximidad" se interpreta en sentido temporal: coordinación no tiene
   * un punto geográfico de referencia fijo desde el cual medir distancia.
   */
  getRiskForCoordination(): Promise<ServiceAssignment[]> {
    return this.assignments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.provider', 'provider')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.address', 'address')
      .where('a.risk_level != :verde', { verde: RiskLevel.VERDE })
      .orderBy(
        `CASE a.risk_level
           WHEN '${RiskLevel.ROJO}' THEN 0
           WHEN '${RiskLevel.NARANJA}' THEN 1
           WHEN '${RiskLevel.AMARILLO}' THEN 2
           ELSE 3
         END`,
        'ASC',
      )
      .addOrderBy('ABS(EXTRACT(EPOCH FROM (a.start_time - NOW())))', 'ASC')
      .getMany();
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
