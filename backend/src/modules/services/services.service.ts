import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AssignmentStatus, RiskLevel, ServiceStatus } from '../../common/enums';
import { ARGENTINA_TZ, argentinaDayRangeUtc } from '../../common/timezone.util';
import { AttendanceEvent } from '../attendance/entities/attendance-event.entity';
import { PreServiceLocationEvent } from '../tracking/entities/pre-service-location-event.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientAddress } from '../patients/entities/patient-address.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Provider } from '../providers/entities/provider.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import {
  FranjaHoraria,
  QueryServicesDto,
} from './dto/query-services.dto';
import { QueryServiceListDto, ServiceScope } from './dto/query-service-list.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceAssignment } from './entities/service-assignment.entity';
import { Service } from './entities/service.entity';

/** Rango horario [desde, hasta) en hora local Argentina por franja. */
const FRANJA_HORAS: Record<FranjaHoraria, [number, number]> = {
  [FranjaHoraria.MADRUGADA]: [0, 6],
  [FranjaHoraria.MANANA]: [6, 12],
  [FranjaHoraria.TARDE]: [12, 18],
  [FranjaHoraria.NOCHE]: [18, 24],
};

/** Código de error de Postgres para violación de clave foránea. */
const PG_FOREIGN_KEY_VIOLATION = '23503';

/** Indica si el error es una violación de clave foránea de Postgres. */
function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string })?.code === PG_FOREIGN_KEY_VIOLATION
  );
}

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
    @InjectRepository(AttendanceEvent)
    private readonly attendanceEvents: Repository<AttendanceEvent>,
    @InjectRepository(PreServiceLocationEvent)
    private readonly locationEvents: Repository<PreServiceLocationEvent>,
    private readonly notifications: NotificationsService,
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

  /**
   * Actualiza un servicio. Si vienen startTime/endTime se convierten a Date;
   * si viene addressId se recargan la ciudad/provincia del nuevo domicilio.
   */
  async updateService(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.services.findOne({
      where: { id },
      relations: { patient: true, address: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (dto.patientId) {
      const patient = await this.patients.findOne({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new NotFoundException('Persona a cuidar no encontrada');
      }
      service.patient = patient;
    }

    if (dto.addressId) {
      const address = await this.addresses.findOne({
        where: { id: dto.addressId },
      });
      if (!address) {
        throw new NotFoundException('Domicilio no encontrado');
      }
      service.address = address;
      // La ciudad/provincia siguen al domicilio (igual que en createService).
      service.ciudad = address.ciudad;
      service.provincia = address.provincia;
    }

    if (dto.fecha) {
      service.fecha = dto.fecha;
    }
    if (dto.startTime) {
      service.startTime = new Date(dto.startTime);
    }
    if (dto.endTime) {
      service.endTime = new Date(dto.endTime);
    }

    return this.services.save(service);
  }

  /**
   * Elimina físicamente un servicio. Si tiene asignaciones asociadas, la FK
   * de service_assignments.service (sin cascade) lanza una violación.
   */
  async removeService(id: string): Promise<void> {
    const service = await this.services.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    try {
      await this.services.delete(id);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'No se puede eliminar el servicio: tiene asignaciones asociadas',
        );
      }
      throw error;
    }
  }

  /**
   * Lista paginada de servicios para el panel, enriquecida con la asignación
   * operativa activa (la no cancelada) de cada servicio: prestador, estado,
   * nivel de riesgo y bandera de reemplazo. Es de solo lectura; no toca el
   * motor de riesgo ni el contrato de creación de asignaciones.
   *
   * Filtros opcionales (todos en el servidor): alcance del día, estado de la
   * asignación, nivel de riesgo, sin asignar y requiere reemplazo.
   */
  async findAllServices(query: QueryServiceListDto): Promise<Service[]> {
    const { page, limit, scope, status, risk, sinAsignar, replacement } = query;
    const today = scope === ServiceScope.HOY;

    const qb = this.services
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.patient', 'patient')
      .leftJoinAndSelect('s.address', 'address')
      // La asignación activa es la que no está cancelada (a lo sumo una).
      .leftJoinAndSelect('s.assignments', 'a', 'a.status != :cancelado', {
        cancelado: AssignmentStatus.CANCELADO,
      })
      .leftJoinAndSelect('a.provider', 'provider');

    if (today) {
      const { start, end } = argentinaDayRangeUtc();
      qb.andWhere('s.start_time BETWEEN :start AND :end', { start, end });
    }
    if (status) {
      qb.andWhere('a.status = :status', { status });
    }
    if (risk) {
      qb.andWhere('a.risk_level = :risk', { risk });
    }
    if (sinAsignar) {
      qb.andWhere('a.id IS NULL');
    }
    if (replacement) {
      qb.andWhere('a.replacement_required = true');
    }

    // Importante: ordenar por la PROPIEDAD de la entidad (`startTime`), no por
    // la columna cruda (`start_time`). Con `skip`/`take` + join a una colección
    // (`s.assignments`), TypeORM arma una query distinct para paginar y necesita
    // la metadata de la columna del ORDER BY; con el nombre crudo no la resuelve
    // y rompe con "Cannot read properties of undefined (reading 'databaseName')".
    qb.orderBy('s.startTime', today ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const services = await qb.getMany();

    // Exponer la asignación activa como objeto único. Si un servicio tuviera
    // más de una asignación no cancelada (caso atípico), se toma la más
    // reciente para que el panel muestre la vigente, no una al azar.
    for (const service of services) {
      const active = (service.assignments ?? []).reduce<ServiceAssignment | null>(
        (latest, candidate) =>
          !latest || candidate.createdAt > latest.createdAt ? candidate : latest,
        null,
      );
      (
        service as Service & { assignment: ServiceAssignment | null }
      ).assignment = active;
    }
    return services;
  }

  /** Devuelve un servicio individual con sus relaciones para la ficha. */
  async findService(id: string): Promise<Service> {
    const service = await this.services.findOne({
      where: { id },
      relations: { patient: true, address: true },
    });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return service;
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

    // Avisar al prestador que tiene una nueva persona a cuidar.
    await this.notifications.notifyProvider(
      provider.id,
      'nueva_asignacion',
      {
        assignmentId: assignment.id,
        startTime: assignment.startTime.toISOString(),
      },
      assignment.id,
    );

    return assignment;
  }

  /** Asignaciones del prestador para el día de hoy (zona horaria Argentina). */
  async getTodayForProvider(
    providerId: string,
  ): Promise<ServiceAssignment[]> {
    const { start, end } = argentinaDayRangeUtc();
    const result = await this.assignments.find({
      where: {
        provider: { id: providerId },
        startTime: Between(start, end),
      },
      relations: { patient: true, address: true },
      order: { startTime: 'ASC' },
    });
    return result;
  }

  /** Servicio actual o próximo del prestador (el primero aún no cerrado). */
  async getCurrentForProvider(
    providerId: string,
  ): Promise<ServiceAssignment | null> {
    const result = await this.assignments.findOne({
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
    return result;
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

  async findAssignment(id: string): Promise<
    ServiceAssignment & {
      attendanceEvents: AttendanceEvent[];
      locationEvents: PreServiceLocationEvent[];
    }
  > {
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

    // La ficha de coordinación arma su línea de tiempo de campo con estos
    // eventos; sin esto la asignación llega sin historial. Se cargan por
    // repositorio (no hay relación OneToMany en la entidad) ordenados de más
    // reciente a más antiguo, que es como los lee el panel.
    const [attendanceEvents, locationEvents] = await Promise.all([
      this.attendanceEvents.find({
        where: { assignment: { id } },
        order: { timestampServer: 'DESC' },
      }),
      this.locationEvents.find({
        where: { assignment: { id } },
        order: { timestampServer: 'DESC' },
      }),
    ]);

    return Object.assign(assignment, { attendanceEvents, locationEvents });
  }

  /** Lista paginada de asignaciones operativas. */
  findAllAssignments(pagination: PaginationDto): Promise<ServiceAssignment[]> {
    const { page, limit } = pagination;
    return this.assignments.find({
      relations: { patient: true, address: true, provider: true },
      order: { startTime: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Actualiza una asignación. Si viene providerId se reasigna a otro
   * prestador; status/riskLevel/replacementRequired se aplican si vienen.
   */
  async updateAssignment(
    id: string,
    dto: UpdateAssignmentDto,
  ): Promise<ServiceAssignment> {
    const assignment = await this.assignments.findOne({
      where: { id },
      relations: { patient: true, address: true, provider: true, service: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    const previousStatus = assignment.status;
    const previousProviderId = assignment.provider?.id ?? null;

    let providerCambio: string | null = null;
    if (dto.providerId) {
      const provider = await this.providers.findOne({
        where: { id: dto.providerId },
      });
      if (!provider) {
        throw new NotFoundException('Prestador no encontrado');
      }
      assignment.provider = provider;
      if (previousProviderId !== provider.id) {
        providerCambio = provider.id;
      }
    }

    if (dto.status !== undefined) {
      assignment.status = dto.status;
    }
    if (dto.riskLevel !== undefined) {
      assignment.riskLevel = dto.riskLevel;
    }
    if (dto.replacementRequired !== undefined) {
      assignment.replacementRequired = dto.replacementRequired;
    }

    const saved = await this.assignments.save(assignment);

    if (providerCambio) {
      await this.notifications.notifyProvider(
        providerCambio,
        'cambio_asignacion',
        { assignmentId: saved.id },
        saved.id,
      );
    }

    // Cancelación: avisar al prestador que pierde el servicio (sólo en la
    // transición a CANCELADO, para no reenviar en updates repetidos).
    const cancelado =
      saved.status === AssignmentStatus.CANCELADO &&
      previousStatus !== AssignmentStatus.CANCELADO;
    if (cancelado && previousProviderId) {
      await this.notifications.notifyProvider(
        previousProviderId,
        'asignacion_cancelada',
        { assignmentId: saved.id },
        saved.id,
      );
    }

    return saved;
  }

  /**
   * Elimina físicamente una asignación. Si es la asignación original de un
   * reemplazo, la FK de service_assignments.original_assignment (sin cascade)
   * lanza una violación. El resto de relaciones tienen onDelete CASCADE.
   */
  async removeAssignment(id: string): Promise<void> {
    const assignment = await this.assignments.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    try {
      await this.assignments.delete(id);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'No se puede eliminar la asignación: es la asignación original de un reemplazo',
        );
      }
      throw error;
    }
  }
}
