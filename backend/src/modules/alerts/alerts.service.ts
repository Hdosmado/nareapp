import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AlertSeverity, AlertStatus, AlertType } from '../../common/enums';
import { User } from '../auth/entities/user.entity';
import { OperationalAlert } from './entities/operational-alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(OperationalAlert)
    private readonly alerts: Repository<OperationalAlert>,
  ) {}

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
    return this.alerts.save(
      this.alerts.create({
        assignment: { id: assignmentId },
        type,
        severity,
        status: AlertStatus.ABIERTA,
      }),
    );
  }

  /** Alertas activas (abiertas o en gestión), para el panel de coordinación. */
  listActive(): Promise<OperationalAlert[]> {
    return this.alerts.find({
      where: { status: In([AlertStatus.ABIERTA, AlertStatus.EN_GESTION]) },
      relations: { assignment: true },
      order: { createdAt: 'DESC' },
    });
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
}
