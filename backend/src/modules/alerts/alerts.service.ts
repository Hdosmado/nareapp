import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AlertSeverity, AlertStatus, AlertType } from '../../common/enums';
import { User } from '../auth/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { OperationalAlert } from './entities/operational-alert.entity';

/** Severidades que disparan push al prestador asignado. */
const PUSH_SEVERITIES = new Set<AlertSeverity>([
  AlertSeverity.ALTA,
  AlertSeverity.CRITICA,
]);

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(OperationalAlert)
    private readonly alerts: Repository<OperationalAlert>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Si la alerta es de severidad alta o crítica, dispara push al prestador. */
  private async maybeNotify(
    assignmentId: string,
    type: AlertType,
    severity: AlertSeverity,
    alertId: string,
  ): Promise<void> {
    if (!PUSH_SEVERITIES.has(severity)) return;
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
      relations: { provider: true },
    });
    if (!assignment?.provider) return;
    await this.notifications.notifyProvider(
      assignment.provider.id,
      'alerta_riesgo',
      { alertId, type, severity },
      assignmentId,
    );
  }

  /**
   * Crea una alerta para una asignación. Si ya existe una alerta abierta o en
   * gestión del mismo tipo, la reutiliza (evita duplicados del motor de riesgo).
   */
  async raiseAlert(
    assignmentId: string,
    type: AlertType,
    severity: AlertSeverity,
  ): Promise<OperationalAlert> {
    const existing = await this.alerts.findOne({
      where: {
        assignment: { id: assignmentId },
        type,
        status: In([AlertStatus.ABIERTA, AlertStatus.EN_GESTION]),
      },
    });
    if (existing) {
      return existing;
    }
    const saved = await this.alerts.save(
      this.alerts.create({
        assignment: { id: assignmentId },
        type,
        severity,
        status: AlertStatus.ABIERTA,
      }),
    );
    await this.maybeNotify(assignmentId, type, severity, saved.id);
    return saved;
  }

  /** Query base con prestador, persona a cuidar y servicio de la asignación. */
  private alertsWithParties() {
    return this.alerts
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.assignment', 'assignment')
      .leftJoinAndSelect('assignment.provider', 'provider')
      .leftJoinAndSelect('assignment.patient', 'patient')
      .leftJoinAndSelect('assignment.service', 'service');
  }

  /**
   * Alertas operativas (vigentes) para el panel: todo lo que NO sea, a la vez,
   * de un servicio ya terminado y resuelto. Es decir, sigue acá si el servicio
   * está en curso O si la alerta no se resolvió (una alerta sin resolver no
   * desaparece sola, aunque el turno ya haya terminado). Carga prestador,
   * persona a cuidar y servicio para el quién/qué de la grilla.
   */
  listActive(): Promise<OperationalAlert[]> {
    return this.alertsWithParties()
      .where(
        '(alert.status IN (:...unresolved) OR assignment.endTime IS NULL OR assignment.endTime > :now)',
        {
          unresolved: [AlertStatus.ABIERTA, AlertStatus.EN_GESTION],
          now: new Date(),
        },
      )
      .orderBy('alert.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Historial de alertas: las de servicios ya terminados Y resueltas (o
   * descartadas). Paginado, de la más reciente a la más antigua.
   */
  listHistory(pagination: PaginationDto): Promise<OperationalAlert[]> {
    const { page, limit } = pagination;
    return this.alertsWithParties()
      .where('assignment.endTime <= :now', { now: new Date() })
      .andWhere('alert.status IN (:...resolved)', {
        resolved: [AlertStatus.RESUELTA, AlertStatus.DESCARTADA],
      })
      .orderBy('alert.resolvedAt', 'DESC')
      .addOrderBy('alert.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  /** Marca una alerta como resuelta. */
  async resolve(id: string, coordinatorId: string): Promise<OperationalAlert> {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }
    alert.status = AlertStatus.RESUELTA;
    alert.resolvedAt = new Date();
    alert.assignedCoordinator = { id: coordinatorId } as User;
    return this.alerts.save(alert);
  }

  /** Crea una alerta operativa de forma manual desde el panel. */
  async create(dto: CreateAlertDto): Promise<OperationalAlert> {
    const alert = this.alerts.create({
      assignment: { id: dto.assignmentId },
      type: dto.type,
      severity: dto.severity,
      status: dto.status,
    });
    await this.alerts.save(alert);
    await this.maybeNotify(dto.assignmentId, dto.type, dto.severity, alert.id);
    return this.findOne(alert.id);
  }

  /** Lista paginada de alertas para el panel, ordenadas por fecha de alta. */
  findAll(pagination: PaginationDto): Promise<OperationalAlert[]> {
    const { page, limit } = pagination;
    return this.alerts.find({
      relations: { assignment: true, assignedCoordinator: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<OperationalAlert> {
    const alert = await this.alerts.findOne({
      where: { id },
      relations: { assignment: true, assignedCoordinator: true },
    });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }
    return alert;
  }

  /** Actualiza una alerta operativa. */
  async update(id: string, dto: UpdateAlertDto): Promise<OperationalAlert> {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }
    this.alerts.merge(alert, {
      assignment: dto.assignmentId ? { id: dto.assignmentId } : undefined,
      type: dto.type,
      severity: dto.severity,
      status: dto.status,
    });
    await this.alerts.save(alert);
    return this.findOne(id);
  }

  /** Elimina físicamente una alerta operativa. */
  async remove(id: string): Promise<void> {
    const alert = await this.alerts.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }
    await this.alerts.delete(id);
  }
}
