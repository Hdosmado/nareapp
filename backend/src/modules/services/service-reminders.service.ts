import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { AssignmentStatus } from '../../common/enums';
import { AppConfigService } from '../config/app-config.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ServiceAssignment } from './entities/service-assignment.entity';

/**
 * Cuánto antes del inicio del servicio se envía el recordatorio, por defecto.
 * Configurable en `app_config` con la clave `reminder.lead_min` (alineado con
 * el arranque del tracking automático, `tracking.lead_min`).
 */
const DEFAULT_REMINDER_LEAD_MINUTES = 10;

/** Tolerancia de la ventana de scan (en minutos) para no perder ningún servicio. */
const REMINDER_WINDOW_MINUTES = 2;

/** Estados en los que tiene sentido recordar al prestador. */
const REMINDABLE_STATES = [
  AssignmentStatus.PENDIENTE,
  AssignmentStatus.PROXIMO,
  AssignmentStatus.EN_CAMINO,
  AssignmentStatus.EN_RIESGO,
];

/**
 * Disparador de `recordatorio_servicio`.
 *
 * Cada minuto busca asignaciones cuyo `startTime` está aproximadamente a
 * `REMINDER_LEAD_MINUTES` minutos en el futuro y todavía no recibieron el
 * recordatorio. Para cada una notifica al prestador y deja un sello
 * `reminderSentAt` para no duplicar.
 *
 * Es idempotente: el filtro `reminderSentAt IS NULL` impide reenvíos. La
 * ventana ±`REMINDER_WINDOW_MINUTES` cubre la latencia del cron.
 */
@Injectable()
export class ServiceRemindersService {
  private readonly logger = new Logger(ServiceRemindersService.name);

  constructor(
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledScan(): Promise<void> {
    try {
      const sent = await this.scan();
      if (sent > 0) {
        this.logger.log(`recordatorio_servicio enviado a ${sent} servicio(s)`);
      }
    } catch (error) {
      this.logger.error(
        'Falló el scan de recordatorio_servicio',
        (error as Error)?.stack,
      );
    }
  }

  /** Ejecuta una pasada; devuelve cuántos recordatorios disparó. */
  async scan(): Promise<number> {
    const now = new Date();
    const leadMin = this.config.getNumber(
      'reminder.lead_min',
      DEFAULT_REMINDER_LEAD_MINUTES,
    );
    const from = new Date(
      now.getTime() + (leadMin - REMINDER_WINDOW_MINUTES) * 60_000,
    );
    const to = new Date(
      now.getTime() + (leadMin + REMINDER_WINDOW_MINUTES) * 60_000,
    );

    const due = await this.assignments.find({
      where: REMINDABLE_STATES.map((status) => ({
        status,
        startTime: Between(from, to),
        reminderSentAt: IsNull(),
        provider: { id: Not(IsNull()) },
      })),
      relations: { provider: true },
    });

    for (const assignment of due) {
      if (!assignment.provider) continue;
      await this.notifications.notifyProvider(
        assignment.provider.id,
        'recordatorio_servicio',
        {
          assignmentId: assignment.id,
          startTime: assignment.startTime.toISOString(),
        },
        assignment.id,
      );
      assignment.reminderSentAt = new Date();
      await this.assignments.save(assignment);
    }

    return due.length;
  }
}
