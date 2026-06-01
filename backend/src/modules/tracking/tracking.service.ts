import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentStatus, ConnectivityStatus } from '../../common/enums';
import { distanceMeters } from '../../common/geo/geo.util';
import { ProviderDevice } from '../devices/entities/provider-device.entity';
import { ServiceAssignment } from '../services/entities/service-assignment.entity';
import { PreServiceLocationDto } from './dto/pre-service-location.dto';
import { PreServiceLocationEvent } from './entities/pre-service-location-event.entity';

/**
 * Precisión (radio de error en metros) a partir de la cual un latido es
 * inservible para afirmar presencia: aunque las coordenadas caigan dentro del
 * radio, con tanto error el "dentro" no es prueba. Se marca como sospechoso y
 * NUNCA cuenta como dentro de la geocerca.
 */
const MAX_ACCURACY_M = 100;

/**
 * Velocidad máxima plausible (m/s) entre dos latidos consecutivos. ~150 km/h
 * cubre auto/autopista con margen; por encima asumimos un salto teletransporte
 * (coordenadas falseadas o latidos fuera de orden) y marcamos sospechoso.
 */
const MAX_PLAUSIBLE_SPEED_MPS = 42;

/**
 * Tolerancias del timestamp del cliente respecto de la hora del servidor.
 * El servidor es la autoridad: un `timestampLocal` futuro o demasiado viejo
 * no se acepta como momento del latido (se cae a la hora de servidor) y marca
 * el latido como sospechoso.
 */
const MAX_TIMESTAMP_FUTURE_MS = 2 * 60_000; // 2 min de adelanto tolerado (reloj del teléfono)
const MAX_TIMESTAMP_AGE_MS = 24 * 60 * 60_000; // 24 h de atraso (cola offline legítima)

/** Etiqueta el tramo del servicio al que pertenece el latido. */
function originForStatus(status: AssignmentStatus): string {
  switch (status) {
    case AssignmentStatus.EN_SERVICIO:
      return 'en_servicio';
    case AssignmentStatus.FINALIZADO:
      return 'post_servicio';
    default:
      return 'pre_servicio_tracking';
  }
}

/** Opciones del latido. Se mantiene como objeto para no romper a SyncService. */
export interface RecordLocationOptions {
  isMocked?: boolean;
}

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(PreServiceLocationEvent)
    private readonly events: Repository<PreServiceLocationEvent>,
    @InjectRepository(ServiceAssignment)
    private readonly assignments: Repository<ServiceAssignment>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
  ) {}

  /**
   * Registra un latido de ubicación del prestador. Sirve para toda la ventana
   * de tracking automático (previo, en servicio y post-fin): el tramo se deduce
   * del estado de la asignación.
   *
   * EL SERVIDOR ES LA AUTORIDAD ANTI-FRAUDE: no confía en ningún flag del
   * cliente sobre "dentro de la geocerca". Recalcula `insideGeofence` desde las
   * coordenadas recibidas y el domicilio, y degrada/invalida la presencia ante
   * señales de falseo:
   *  - `isMocked === true` (ubicación simulada) → nunca dentro, sospechoso.
   *  - `accuracy` peor que `MAX_ACCURACY_M` → no cuenta como dentro, sospechoso.
   *  - salto físicamente imposible respecto del latido anterior (velocidad
   *    implausible) → sospechoso (no se confía como dentro).
   *  - `timestampLocal` futuro o demasiado viejo respecto de la hora de
   *    servidor → se ignora (se usa la hora de servidor) y marca sospechoso.
   *
   * @param options Campos opcionales del latido (anti-spoofing). Es un objeto
   *   para mantener compatibilidad con SyncService al agregar campos nuevos.
   */
  async recordLocation(
    assignmentId: string,
    providerId: string,
    deviceId: string | undefined,
    dto: PreServiceLocationDto,
    options: RecordLocationOptions = {},
  ): Promise<PreServiceLocationEvent> {
    const existing = await this.events.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
      relations: { provider: true, address: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (assignment.provider?.id !== providerId) {
      throw new ForbiddenException('La asignación no corresponde al prestador');
    }

    let device: ProviderDevice | undefined;
    if (deviceId) {
      device =
        (await this.devices.findOne({
          where: { deviceId, provider: { id: providerId } },
        })) ?? undefined;
    }

    // Hora de servidor: única autoridad temporal del latido.
    const serverNow = new Date();

    // Ubicación simulada: la app la reporta, pero el servidor sólo la usa para
    // invalidar presencia, nunca para validarla. Acepta el flag del DTO (panel
    // / app directa) o de las opciones (camino SyncService).
    const isMocked = options.isMocked === true || dto.isMocked === true;

    // El cliente puede mentir con la precisión; igual la usamos defensivamente.
    // Distinguimos dos casos:
    //  - `accuracy` reportada y peor que el umbral → señal anti-fraude: no
    //    cuenta como "dentro" y marca sospechoso (el dato es inservible).
    //  - `accuracy` ausente → no podemos confirmar "dentro" (no afirmamos
    //    presencia), pero no lo tratamos como falseo (no marca sospechoso).
    const accuracy = dto.accuracy;
    const accuracyKnownBad = accuracy != null && accuracy > MAX_ACCURACY_M;
    const accuracyConfirmsInside = accuracy != null && accuracy <= MAX_ACCURACY_M;

    // Salto físicamente imposible respecto del último latido de la asignación.
    const speedJump = await this.isImplausibleJump(
      assignment.id,
      dto.latitude,
      dto.longitude,
      serverNow,
    );

    // Acotar el timestamp del cliente con la hora de servidor.
    const { timestampLocal, badTimestamp } = this.resolveTimestampLocal(
      dto.timestampLocal,
      serverNow,
    );

    // Recalcular SIEMPRE desde las coordenadas recibidas y el domicilio. No se
    // confía en ningún flag de geocerca del cliente.
    const address = assignment.address;
    let insideGeofence: boolean | null = null;
    if (address?.latitude != null && address?.longitude != null) {
      const distance = distanceMeters(
        dto.latitude,
        dto.longitude,
        address.latitude,
        address.longitude,
      );
      const geometricallyInside = distance <= address.allowedRadiusM;
      // Un latido sólo cuenta como "dentro" si es geométricamente válido Y
      // confiable: ni simulado, ni un salto imposible, y con una precisión
      // conocida y aceptable que respalde el "dentro". Cualquier señal de
      // falseo, o una precisión inservible/ausente, lo degrada a "no dentro".
      insideGeofence =
        geometricallyInside &&
        !isMocked &&
        !speedJump &&
        accuracyConfirmsInside;
    } else if (isMocked) {
      // Sin coordenadas de domicilio no podemos afirmar geocerca, pero una
      // ubicación simulada nunca es presencia válida.
      insideGeofence = false;
    }

    // Motivo de sospecha (prioridad: lo más grave primero) para auditoría y
    // motor de riesgo. `mocked` > `accuracy` > `speed_jump` > `bad_timestamp`.
    let suspiciousReason: string | null = null;
    if (isMocked) {
      suspiciousReason = 'mocked';
    } else if (accuracyKnownBad) {
      suspiciousReason = 'accuracy';
    } else if (speedJump) {
      suspiciousReason = 'speed_jump';
    } else if (badTimestamp) {
      suspiciousReason = 'bad_timestamp';
    }
    const suspicious = suspiciousReason !== null;

    return this.events.save(
      this.events.create({
        assignment,
        provider: assignment.provider ?? undefined,
        device,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        batteryLevel: dto.batteryLevel,
        connectivityStatus: dto.connectivityStatus ?? ConnectivityStatus.UNKNOWN,
        locationPermission: dto.locationPermission ?? null,
        isMocked,
        insideGeofence,
        suspicious,
        suspiciousReason,
        origin: originForStatus(assignment.status),
        timestampLocal,
        timestampServer: serverNow,
        idempotencyKey: dto.idempotencyKey,
      }),
    );
  }

  /**
   * Detecta un salto físicamente imposible respecto del último latido de la
   * asignación: si la velocidad implícita (distancia / tiempo, usando la hora
   * de servidor de ambos) supera `MAX_PLAUSIBLE_SPEED_MPS`, el punto es
   * sospechoso (coordenadas falseadas o latidos teletransportados). Latidos sin
   * separación temporal positiva se ignoran para no dividir por cero.
   */
  private async isImplausibleJump(
    assignmentId: string,
    latitude: number,
    longitude: number,
    serverNow: Date,
  ): Promise<boolean> {
    const previous = await this.events.findOne({
      where: { assignment: { id: assignmentId } },
      order: { timestampServer: 'DESC' },
    });
    if (!previous) {
      return false;
    }
    const elapsedSeconds =
      (serverNow.getTime() - previous.timestampServer.getTime()) / 1000;
    if (elapsedSeconds <= 0) {
      // Latidos simultáneos o fuera de orden: no podemos estimar velocidad.
      return false;
    }
    const distance = distanceMeters(
      previous.latitude,
      previous.longitude,
      latitude,
      longitude,
    );
    return distance / elapsedSeconds > MAX_PLAUSIBLE_SPEED_MPS;
  }

  /**
   * Acota el `timestampLocal` reportado por el cliente con la hora de servidor.
   * Devuelve la fecha a persistir (la del cliente sólo si es plausible; si es
   * futura o demasiado vieja se cae a la hora de servidor) y si hubo que
   * descartarla (`badTimestamp`), para marcar el latido como sospechoso.
   */
  private resolveTimestampLocal(
    raw: string | undefined,
    serverNow: Date,
  ): { timestampLocal: Date | undefined; badTimestamp: boolean } {
    if (!raw) {
      return { timestampLocal: undefined, badTimestamp: false };
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return { timestampLocal: serverNow, badTimestamp: true };
    }
    const delta = parsed.getTime() - serverNow.getTime();
    const isFuture = delta > MAX_TIMESTAMP_FUTURE_MS;
    const isTooOld = -delta > MAX_TIMESTAMP_AGE_MS;
    if (isFuture || isTooOld) {
      return { timestampLocal: serverNow, badTimestamp: true };
    }
    return { timestampLocal: parsed, badTimestamp: false };
  }
}
