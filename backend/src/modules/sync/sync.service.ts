import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { TrackingService } from '../tracking/tracking.service';
import { SyncEventDto, SyncEventsDto, SyncEventType } from './dto/sync-events.dto';

/** Resultado de la sincronización de un evento individual. */
export interface SyncResult {
  idempotencyKey: string;
  status: 'ok' | 'error';
  message?: string;
}

/**
 * Procesa lotes de eventos encolados por la app mobile durante cortes de
 * conexión. Cada evento se delega a su servicio, que es idempotente: los
 * reenvíos no generan duplicados.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly attendance: AttendanceService,
    private readonly tracking: TrackingService,
  ) {}

  async processBatch(
    providerId: string,
    deviceId: string | undefined,
    dto: SyncEventsDto,
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    for (const event of dto.events) {
      try {
        await this.processOne(providerId, deviceId, event);
        results.push({ idempotencyKey: event.idempotencyKey, status: 'ok' });
      } catch (error) {
        const message = (error as Error).message;
        this.logger.warn(
          `Evento ${event.idempotencyKey} no sincronizado: ${message}`,
        );
        results.push({
          idempotencyKey: event.idempotencyKey,
          status: 'error',
          message,
        });
      }
    }
    return results;
  }

  private processOne(
    providerId: string,
    deviceId: string | undefined,
    event: SyncEventDto,
  ): Promise<unknown> {
    const needsLocation = event.type !== SyncEventType.CHECK_OUT;
    if (needsLocation && (event.latitude == null || event.longitude == null)) {
      throw new BadRequestException(
        'El evento requiere latitud y longitud',
      );
    }

    switch (event.type) {
      case SyncEventType.CHECK_IN:
        return this.attendance.checkIn(event.assignmentId, providerId, deviceId, {
          latitude: event.latitude as number,
          longitude: event.longitude as number,
          accuracy: event.accuracy,
          timestampLocal: event.timestampLocal,
          idempotencyKey: event.idempotencyKey,
          exceptionReason: event.exceptionReason,
        });
      case SyncEventType.CHECK_OUT:
        return this.attendance.checkOut(
          event.assignmentId,
          providerId,
          deviceId,
          {
            latitude: event.latitude,
            longitude: event.longitude,
            accuracy: event.accuracy,
            timestampLocal: event.timestampLocal,
            idempotencyKey: event.idempotencyKey,
          },
        );
      case SyncEventType.PRE_SERVICE_LOCATION:
        return this.tracking.recordLocation(
          event.assignmentId,
          providerId,
          deviceId,
          {
            latitude: event.latitude as number,
            longitude: event.longitude as number,
            accuracy: event.accuracy,
            timestampLocal: event.timestampLocal,
            idempotencyKey: event.idempotencyKey,
          },
        );
      default:
        throw new BadRequestException('Tipo de evento desconocido');
    }
  }
}
