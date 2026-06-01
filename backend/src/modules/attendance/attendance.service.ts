import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { AssignmentStatus, AttendanceType, RiskLevel } from '../../common/enums';
import { distanceMeters } from '../../common/geo/geo.util';
import { diffMinutes } from '../../common/timezone.util';
import { AppConfigService } from '../config/app-config.service';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';

/**
 * Opciones de origen del evento de fichaje. El path offline (SyncService)
 * reentrega eventos demorados; se marcan para distinguir la prueba normal de
 * la diferida y aplicar las reglas anti-fraude con criterio.
 */
export interface AttendanceOptions {
  /** El evento llega por el path de sincronización offline (no en vivo). */
  offline?: boolean;
}

/**
 * Tolerancia máxima, en minutos, para timestamps del teléfono respecto de la
 * hora del servidor. El cálculo anti-fraude siempre usa la hora del servidor;
 * el timestamp del cliente es informativo y se acota para descartar relojes
 * manipulados o desfasados.
 */
const CLIENT_CLOCK_SKEW_MIN = 5;

/**
 * Edad máxima (en minutos) que se acepta para un evento reenviado por el path
 * offline sin tratamiento especial. Más viejo que esto se marca igualmente como
 * sincronizado, pero queda como candidato a requerir aprobación de coordinación
 * (followup: flujo de aprobación de prueba diferida).
 */
const OFFLINE_MAX_AGE_MIN = 12 * 60;

/** Estados desde los que es válido confirmar la llegada ("LLEGUÉ"). */
const CHECK_IN_ALLOWED_FROM: AssignmentStatus[] = [
  AssignmentStatus.PENDIENTE,
  AssignmentStatus.PROXIMO,
  AssignmentStatus.EN_RIESGO,
  AssignmentStatus.EN_CAMINO,
  AssignmentStatus.DEMORADO,
  AssignmentStatus.LLEGO,
];

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEvent)
    private readonly events: Repository<AttendanceEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    // AppConfigService es opcional para no romper el arranque si el módulo no
    // está cableado todavía; ante su ausencia se usan los mismos valores por
    // defecto que el resto del sistema (ver followups: importar AppConfigModule
    // en AttendanceModule).
    @Optional()
    private readonly config?: AppConfigService,
  ) {}

  /** Registra la llegada del prestador al domicilio ("LLEGUÉ"). */
  async checkIn(
    assignmentId: string,
    providerId: string,
    deviceId: string | undefined,
    dto: CheckInDto,
    options: AttendanceOptions = {},
  ): Promise<AttendanceEvent> {
    // La hora del servidor es la autoridad anti-fraude: toda decisión
    // (ventana, geocerca, temprano) se mide contra ella, nunca contra el reloj
    // del teléfono.
    const now = new Date();

    return this.runIdempotent(dto.idempotencyKey, async (manager) => {
      const assignment = await this.lockOwnedAssignment(
        manager,
        assignmentId,
        providerId,
      );
      const device = await this.resolveDevice(manager, deviceId, providerId);

      // H6/H12: máquina de estados. Sólo se permite "LLEGUÉ" desde estados
      // previos al servicio y si todavía no hay fichaje de entrada.
      this.assertCheckInAllowed(assignment);

      // H8: el timestamp del cliente se acota; el cálculo usa la hora del
      // servidor. En el path offline se tolera un evento más viejo (la app lo
      // reentrega tarde), pero igualmente se valida contra límites.
      const timestampLocal = this.resolveClientTimestamp(
        dto.timestampLocal,
        now,
        options.offline === true,
      );

      // H6/H12: ventana temporal. No se admite fichar horas antes del inicio
      // ni mucho después del fin del servicio.
      this.assertCheckInWindow(assignment, now);

      // C2: el servidor recomputa la distancia al domicilio con las coords
      // recibidas. Nunca confía en un flag "inside" del cliente.
      const { distance, inside } = this.computeGeofence(
        assignment,
        dto.latitude,
        dto.longitude,
      );

      const exceptionReason = dto.exceptionReason?.trim() || undefined;
      const isMocked = dto.isMocked === true;

      // C2 + anti-spoofing: una llegada fuera del radio O con ubicación simulada
      // (mock) no es prueba válida por sí sola. Sin motivo de excepción se
      // rechaza; con motivo se registra como excepción y NO se blanquea a VERDE:
      // queda en riesgo para que coordinación lo vea y el motor pueda escalar.
      const suspicious = inside === false || isMocked;
      if (suspicious && !exceptionReason) {
        throw new ConflictException(
          isMocked
            ? 'La ubicación de la llegada es simulada; ' +
              'se requiere un motivo de excepción para registrarla'
            : 'La llegada está fuera del radio permitido del domicilio; ' +
              'se requiere un motivo de excepción para registrarla',
        );
      }

      // El riesgo de entrada lo fija el servidor: VERDE sólo si la llegada es
      // dentro del radio, no simulada (o el domicilio no tiene coordenadas para
      // validar). Sospechosa => NARANJA.
      const riskLevel = suspicious ? RiskLevel.NARANJA : RiskLevel.VERDE;

      const event = await manager.save(
        manager.create(AttendanceEvent, {
          assignment,
          provider: assignment.provider ?? undefined,
          device,
          type: AttendanceType.CHECK_IN,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          distanceToAddress: distance,
          insideAllowedRadius: inside,
          isMocked,
          timestampLocal,
          timestampServer: now,
          offlineSynced: options.offline === true,
          exceptionReason,
          idempotencyKey: dto.idempotencyKey,
        }),
      );

      assignment.status = AssignmentStatus.EN_SERVICIO;
      assignment.checkInAt = now;
      assignment.riskLevel = riskLevel;
      await manager.save(assignment);

      return event;
    });
  }

  /** Registra el fin del servicio y detiene el seguimiento operativo. */
  async checkOut(
    assignmentId: string,
    providerId: string,
    deviceId: string | undefined,
    dto: CheckOutDto,
    options: AttendanceOptions = {},
  ): Promise<AttendanceEvent> {
    const now = new Date();

    return this.runIdempotent(dto.idempotencyKey, async (manager) => {
      const assignment = await this.lockOwnedAssignment(
        manager,
        assignmentId,
        providerId,
      );
      const device = await this.resolveDevice(manager, deviceId, providerId);

      // H6/H12: sólo se permite cerrar un servicio efectivamente EN_SERVICIO,
      // con fichaje de entrada y sin fichaje de salida previo.
      this.assertCheckOutAllowed(assignment);

      this.resolveClientTimestamp(
        dto.timestampLocal,
        now,
        options.offline === true,
      );

      // H7/M7: el cierre temprano lo decide el SERVIDOR comparando la hora del
      // servidor con el fin del servicio (umbral early_checkout.threshold_pct
      // sobre el largo del turno). El motivo del cliente es informativo, no la
      // condición: si el cierre cae en rango "temprano" se exige un motivo.
      const earlyCheckout = this.isEarlyCheckout(assignment, now);
      const earlyCheckoutReason = dto.earlyCheckoutReason?.trim() || null;
      if (earlyCheckout && earlyCheckoutReason === null) {
        throw new ConflictException(
          'El servicio se cierra antes del horario previsto; ' +
            'se requiere un motivo para el cierre temprano',
        );
      }

      const event = await manager.save(
        manager.create(AttendanceEvent, {
          assignment,
          provider: assignment.provider ?? undefined,
          device,
          type: AttendanceType.CHECK_OUT,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          isMocked: dto.isMocked === true,
          timestampLocal: dto.timestampLocal
            ? new Date(dto.timestampLocal)
            : undefined,
          timestampServer: now,
          offlineSynced: options.offline === true,
          // Se conserva el motivo sólo cuando aplica el cierre temprano; en un
          // cierre normal se ignora cualquier motivo enviado.
          earlyCheckoutReason: earlyCheckout ? earlyCheckoutReason : null,
          idempotencyKey: dto.idempotencyKey,
        }),
      );

      assignment.status = AssignmentStatus.FINALIZADO;
      assignment.checkOutAt = now;
      assignment.earlyCheckout = earlyCheckout;
      await manager.save(assignment);

      return event;
    });
  }

  /**
   * M5: ejecuta la lectura idempotente + la mutación de estado dentro de una
   * transacción con bloqueo pesimista sobre la asignación. El insert del evento
   * es idempotente a nivel DB (índice único sobre idempotencyKey): si una
   * carrera viola la unicidad (23505) se devuelve el evento ya persistido.
   */
  private async runIdempotent(
    idempotencyKey: string,
    work: (manager: EntityManager) => Promise<AttendanceEvent>,
  ): Promise<AttendanceEvent> {
    try {
      return await this.events.manager.transaction(async (manager) => {
        const existing = await manager.findOne(AttendanceEvent, {
          where: { idempotencyKey },
        });
        if (existing) {
          return existing;
        }
        return work(manager);
      });
    } catch (error) {
      // 23505 = unique_violation: otra request concurrente insertó el evento
      // con la misma clave de idempotencia. Devolvemos el resultado idempotente.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === '23505'
      ) {
        const existing = await this.events.findOne({
          where: { idempotencyKey },
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /** H6/H12: valida que la asignación admita un fichaje de entrada. */
  private assertCheckInAllowed(assignment: ServiceAssignment): void {
    if (assignment.checkInAt) {
      throw new ConflictException(
        'La asignación ya tiene una llegada registrada',
      );
    }
    if (assignment.status === AssignmentStatus.EN_SERVICIO) {
      throw new ConflictException('La asignación ya está en servicio');
    }
    if (!CHECK_IN_ALLOWED_FROM.includes(assignment.status)) {
      throw new ConflictException(
        `No se puede registrar la llegada en estado ${assignment.status}`,
      );
    }
  }

  /** H6/H12: valida que la asignación admita un fichaje de salida. */
  private assertCheckOutAllowed(assignment: ServiceAssignment): void {
    if (assignment.status !== AssignmentStatus.EN_SERVICIO) {
      throw new ConflictException(
        `No se puede cerrar un servicio en estado ${assignment.status}`,
      );
    }
    if (!assignment.checkInAt) {
      throw new ConflictException(
        'No se puede cerrar un servicio sin llegada registrada',
      );
    }
    if (assignment.checkOutAt) {
      throw new ConflictException(
        'El servicio ya tiene un cierre registrado',
      );
    }
  }

  /**
   * H6/H12: ventana temporal del fichaje de entrada. Se admite desde que
   * arranca la observación (observation_lead antes del inicio) y hasta poco
   * después del fin del servicio. Fichar horas antes o mucho después se rechaza.
   */
  private assertCheckInWindow(assignment: ServiceAssignment, now: Date): void {
    const leadMin = this.config?.getNumber('risk.observation_lead_min', 45) ?? 45;
    const trailMin = this.config?.getNumber('tracking.trail_min', 10) ?? 10;

    const minutesToStart = diffMinutes(assignment.startTime, now);
    // Demasiado temprano: aún no arrancó la ventana de observación.
    if (minutesToStart > leadMin) {
      throw new ConflictException(
        'Todavía es demasiado pronto para registrar la llegada a este servicio',
      );
    }
    // Demasiado tarde: ya pasó el fin del servicio más el margen de cierre.
    const minutesAfterEnd = diffMinutes(now, assignment.endTime);
    if (minutesAfterEnd > trailMin) {
      throw new ConflictException(
        'El horario del servicio ya finalizó; no se puede registrar la llegada',
      );
    }
  }

  /**
   * C2: recomputa server-side la distancia al domicilio y si cae dentro del
   * radio permitido. Devuelve `inside === undefined` cuando el domicilio no
   * tiene coordenadas para validar (no se puede afirmar nada anti-fraude).
   */
  private computeGeofence(
    assignment: ServiceAssignment,
    latitude: number,
    longitude: number,
  ): { distance: number | undefined; inside: boolean | undefined } {
    const address = assignment.address;
    if (address?.latitude == null || address?.longitude == null) {
      return { distance: undefined, inside: undefined };
    }
    const distance = distanceMeters(
      latitude,
      longitude,
      address.latitude,
      address.longitude,
    );
    return { distance, inside: distance <= address.allowedRadiusM };
  }

  /**
   * H7/M7: determina, con la hora del servidor, si el cierre es temprano.
   * El umbral es una fracción del largo del turno (early_checkout.threshold_pct):
   * si resta más de esa fracción para el fin, el cierre se considera temprano.
   */
  private isEarlyCheckout(assignment: ServiceAssignment, now: Date): boolean {
    const thresholdPct =
      this.config?.getNumber('early_checkout.threshold_pct', 0.25) ?? 0.25;

    const totalMin = diffMinutes(assignment.endTime, assignment.startTime);
    if (totalMin <= 0) {
      // Turno degenerado (sin duración): un cierre antes del fin es temprano.
      return now < assignment.endTime;
    }
    const remainingMin = diffMinutes(assignment.endTime, now);
    if (remainingMin <= 0) {
      return false;
    }
    return remainingMin / totalMin > thresholdPct;
  }

  /**
   * H8: acota el timestamp del teléfono. Rechaza timestamps futuros o
   * demasiado viejos respecto de la hora del servidor. En el path offline se
   * tolera una antigüedad mayor (la app reentrega tarde), pero igualmente se
   * descartan timestamps futuros y se acota la antigüedad máxima.
   *
   * Devuelve el `Date` parseado (o `undefined` si no vino), pero NO se usa para
   * el cálculo anti-fraude: ese usa siempre `now` (hora del servidor).
   */
  private resolveClientTimestamp(
    timestampLocal: string | undefined,
    now: Date,
    offline: boolean,
  ): Date | undefined {
    if (!timestampLocal) {
      return undefined;
    }
    const parsed = new Date(timestampLocal);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('timestampLocal inválido');
    }

    // Futuro respecto del servidor (más allá del skew tolerado): reloj
    // adelantado o manipulado.
    const minutesAhead = diffMinutes(parsed, now);
    if (minutesAhead > CLIENT_CLOCK_SKEW_MIN) {
      throw new BadRequestException(
        'El timestamp del evento está en el futuro respecto del servidor',
      );
    }

    // Antigüedad: en vivo se tolera muy poco; offline se tolera el reenvío
    // demorado pero con un techo (followup: prueba muy vieja -> aprobación).
    const minutesOld = diffMinutes(now, parsed);
    const maxAge = offline ? OFFLINE_MAX_AGE_MIN : CLIENT_CLOCK_SKEW_MIN;
    if (minutesOld > maxAge) {
      throw new BadRequestException(
        'El timestamp del evento es demasiado antiguo respecto del servidor',
      );
    }

    return parsed;
  }

  private async lockOwnedAssignment(
    manager: EntityManager,
    assignmentId: string,
    providerId: string,
  ): Promise<ServiceAssignment> {
    // Bloqueo pesimista sobre la fila de la asignación para serializar fichajes
    // concurrentes (M5). El lock se toma SIN joins: aplicar FOR UPDATE sobre el
    // lado nullable de un outer join (provider/address) lo rechaza Postgres, así
    // que las relaciones se cargan aparte dentro de la misma transacción.
    const locked = await manager.findOne(ServiceAssignment, {
      where: { id: assignmentId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) {
      throw new NotFoundException('Asignación no encontrada');
    }

    const assignment = await manager.findOne(ServiceAssignment, {
      where: { id: assignmentId },
      relations: { address: true, provider: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (assignment.provider?.id !== providerId) {
      throw new ForbiddenException('La asignación no corresponde al prestador');
    }
    return assignment;
  }

  private async resolveDevice(
    manager: EntityManager,
    deviceId: string | undefined,
    providerId: string,
  ): Promise<ProviderDevice | undefined> {
    if (!deviceId) {
      return undefined;
    }
    const device = await manager.findOne(ProviderDevice, {
      where: { deviceId, provider: { id: providerId } },
    });
    return device ?? undefined;
  }
}
