import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/** Tipo de evento operativo que la app puede sincronizar en diferido. */
export enum SyncEventType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  PRE_SERVICE_LOCATION = 'pre_service_location',
}

/** Evento individual encolado por la app mobile mientras estaba sin conexión. */
export class SyncEventDto {
  @IsEnum(SyncEventType)
  type: SyncEventType;

  @IsUUID()
  assignmentId: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsDateString()
  timestampLocal?: string;

  @IsOptional()
  @IsString()
  exceptionReason?: string;
}

/** Lote de eventos sincronizados al recuperar conexión. */
export class SyncEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events: SyncEventDto[];
}
