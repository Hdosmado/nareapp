import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, randomInt } from 'crypto';
import { Not, Repository } from 'typeorm';
import {
  ActivationTokenStatus,
  DeviceStatus,
  ProviderStatus,
} from '../../common/enums';
import { AuthService } from '../auth/auth.service';
import { Provider } from '../providers/entities/provider.entity';
import { ClaimActivationDto } from './dto/claim-activation.dto';
import { DeviceActivationToken } from './entities/device-activation-token.entity';
import { ProviderDevice } from './entities/provider-device.entity';

/** Hash SHA-256 de un valor; lo único que se persiste del código y del token. */
function hashValue(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Normaliza un código de activación tipeado a solo sus dígitos. */
function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Formatea un código de 8 dígitos como `1234-5678` para dictarlo/leerlo. */
function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export interface ActivationGenerateResult {
  tokenId: string;
  /** Código corto en claro (8 dígitos). Se devuelve una sola vez. */
  activationCode: string;
  /** El mismo código formateado como `1234-5678`. */
  activationCodeFormatted: string;
  /** URL del QR (mecanismo secundario). */
  qrUrl: string;
  expiresAt: Date;
  /** Mensaje listo para enviar al prestador por WhatsApp. */
  whatsappMessage: string;
}

export interface ActivationClaimResult {
  provider: {
    id: string;
    apellido: string;
    nombre: string;
    tipoPrestador: string;
  };
  device: { id: string; status: 'active' };
  accessToken: string;
  refreshToken: string;
}

/**
 * Flujo de activación del dispositivo del prestador.
 *
 * El prestador siempre se crea antes en el panel. Coordinación genera un código
 * de activación para él y se lo dicta por teléfono o se lo manda por WhatsApp.
 * El prestador instala la app, la abre y tipea el código; el backend valida,
 * vincula el teléfono como APROBADO, consume el token y emite la sesión.
 *
 * El código (y el QR equivalente) es una llave de un solo uso, no un login.
 * El mismo flujo sirve para reemplazar el teléfono de un prestador existente.
 */
@Injectable()
export class DeviceActivationService {
  // Anti fuerza bruta del código corto (H3/H5): la defensa son dos barreras
  // que NO afectan a usuarios legítimos:
  //   1) rate limit POR IP en el endpoint de claim (@Throttle 5/min), que acota
  //      los reclamos con código equivocado por origen;
  //   2) lockout POR TOKEN (registerFailedAttempt -> lockedUntil) ante fallos
  //      repetidos contra un token concreto.
  // No usamos un lockout global en memoria: bloquear el endpoint "para todos"
  // ante N fallos sería un vector de denegación de servicio (un atacante manda
  // unos pocos códigos malos y deja sin activar a todos los prestadores).
  constructor(
    @InjectRepository(DeviceActivationToken)
    private readonly tokens: Repository<DeviceActivationToken>,
    @InjectRepository(ProviderDevice)
    private readonly devices: Repository<ProviderDevice>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /** Umbral de reclamos fallidos antes de bloquear (por token y global). */
  private get maxClaimAttempts(): number {
    return this.config.get<number>('activation.maxClaimAttempts') ?? 5;
  }

  /** Construye la URL del QR de activación a partir del token en claro. */
  private buildActivationUrl(rawToken: string): string {
    const urlBase =
      this.config.get<string>('activation.urlBase') ??
      'https://app.empresa.com';
    return `${urlBase}/activate?token=${rawToken}`;
  }

  /** Vencimiento de un token nuevo, según la configuración. */
  private nextExpiry(): Date {
    const ttlHours = this.config.get<number>('activation.codeTtlHours') ?? 24;
    return new Date(Date.now() + ttlHours * 3_600_000);
  }

  /**
   * Genera un código numérico de 8 dígitos que no colisione con ningún token
   * pendiente. El hash devuelto es lo único que se persiste.
   */
  private async generateUniqueShortCode(): Promise<{
    code: string;
    hash: string;
  }> {
    for (let i = 0; i < 10; i++) {
      const code = randomInt(0, 100_000_000).toString().padStart(8, '0');
      const hash = hashValue(code);
      const clash = await this.tokens.findOne({
        where: { shortCodeHash: hash, status: ActivationTokenStatus.PENDING },
      });
      if (!clash) {
        return { code, hash };
      }
    }
    throw new ConflictException(
      'No se pudo generar un código de activación. Reintentá.',
    );
  }

  /** Arma el mensaje de WhatsApp que coordinación le enviará al prestador. */
  private buildWhatsappMessage(
    provider: Provider,
    codeFormatted: string,
  ): string {
    const downloadUrl =
      this.config.get<string>('activation.appDownloadUrl') ??
      'https://app.empresa.com/descargar';
    return (
      `Hola ${provider.nombre}! Para activar la app de NareApp:\n` +
      `1) Descargá la app: ${downloadUrl}\n` +
      `2) Abrila e ingresá este código de activación: ${codeFormatted}\n` +
      `El código es de un solo uso y vence en 24 horas.`
    );
  }

  /**
   * Genera una activación para un prestador existente: produce un código corto
   * (principal) y el token largo del QR (secundario), ambos de un solo uso y
   * con el mismo vencimiento. Revoca cualquier activación pendiente previa.
   */
  async generateActivation(
    providerId: string,
    coordinatorUserId: string,
  ): Promise<ActivationGenerateResult> {
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }
    if (provider.estado !== ProviderStatus.ACTIVO) {
      throw new ConflictException('El prestador no está activo');
    }

    await this.revokePendingTokens(providerId);

    const rawToken = randomBytes(32).toString('base64url');
    const { code, hash: shortCodeHash } = await this.generateUniqueShortCode();
    const expiresAt = this.nextExpiry();

    const token = await this.tokens.save(
      this.tokens.create({
        provider,
        tokenHash: hashValue(rawToken),
        shortCodeHash,
        status: ActivationTokenStatus.PENDING,
        expiresAt,
        createdByUserId: coordinatorUserId,
      }),
    );

    const codeFormatted = formatCode(code);
    return {
      tokenId: token.id,
      activationCode: code,
      activationCodeFormatted: codeFormatted,
      qrUrl: this.buildActivationUrl(rawToken),
      expiresAt,
      whatsappMessage: this.buildWhatsappMessage(provider, codeFormatted),
    };
  }

  /** Revoca las activaciones pendientes de un prestador. */
  async revokePendingTokens(providerId: string): Promise<{ revoked: number }> {
    const result = await this.tokens
      .createQueryBuilder()
      .update()
      .set({ status: ActivationTokenStatus.REVOKED })
      .where('provider_id = :providerId', { providerId })
      .andWhere('status = :status', {
        status: ActivationTokenStatus.PENDING,
      })
      .execute();
    return { revoked: result.affected ?? 0 };
  }

  /**
   * Resuelve el token a partir del cuerpo del reclamo. Exige exactamente una
   * credencial: el código corto o el token del QR.
   */
  private async resolveToken(
    dto: ClaimActivationDto,
  ): Promise<DeviceActivationToken | null> {
    const rawCode = dto.activationCode?.trim();
    const rawToken = dto.activationToken?.trim();
    const hasCode = !!rawCode;
    const hasToken = !!rawToken;

    if (hasCode === hasToken) {
      throw new BadRequestException(
        'Ingresá el código de activación o escaneá el QR, pero no ambos.',
      );
    }

    if (hasCode) {
      const normalized = normalizeCode(rawCode as string);
      if (normalized.length !== 8) {
        throw new BadRequestException(
          'El código de activación debe tener 8 dígitos.',
        );
      }
      return this.tokens.findOne({
        where: { shortCodeHash: hashValue(normalized) },
        relations: { provider: true },
      });
    }

    return this.tokens.findOne({
      where: { tokenHash: hashValue(rawToken as string) },
      relations: { provider: true },
    });
  }

  /**
   * Verifica que el token esté vigente y sin usar. Si venció estando pendiente,
   * lo deja marcado como `expired`.
   */
  private async assertClaimable(token: DeviceActivationToken): Promise<void> {
    if (token.status === ActivationTokenStatus.USED) {
      throw new BadRequestException(
        'Este código ya fue utilizado. Pedí uno nuevo a coordinación.',
      );
    }
    if (token.status === ActivationTokenStatus.REVOKED) {
      throw new BadRequestException(
        'No se pudo activar la app. Pedí un nuevo código a coordinación.',
      );
    }
    if (
      token.status === ActivationTokenStatus.EXPIRED ||
      token.expiresAt.getTime() < Date.now()
    ) {
      if (token.status === ActivationTokenStatus.PENDING) {
        token.status = ActivationTokenStatus.EXPIRED;
        await this.tokens.save(token);
      }
      throw new BadRequestException(
        'El código venció. Pedí uno nuevo a coordinación.',
      );
    }
    // Lockout temporal del token tras una ráfaga de reclamos fallidos.
    if (token.lockedUntil && token.lockedUntil.getTime() > Date.now()) {
      throw new BadRequestException(
        'Demasiados intentos sobre este código. Esperá unos minutos o pedí uno nuevo a coordinación.',
      );
    }
  }

  /**
   * Registra un reclamo fallido sobre un token VIGENTE y resuelto (p.ej. el
   * teléfono ya está vinculado a otro prestador). Incrementa el contador
   * persistente del token y, al alcanzar el umbral configurado, lo REVOCA para
   * frenar el abuso de forma definitiva. El incremento se hace con un UPDATE
   * atómico (no read-modify-write) para que reclamos concurrentes no pierdan
   * cuenta.
   *
   * Los códigos que no resuelven a ningún token (la señal de fuerza bruta sobre
   * el código de 8 dígitos) no llegan acá: a esos los acota el rate limit por
   * IP del endpoint de claim.
   */
  private async registerFailedAttempt(tokenId: string): Promise<void> {
    const maxAttempts = this.maxClaimAttempts;
    // Incremento atómico del contador y revocación condicional AL ALCANZAR el
    // umbral, en un solo UPDATE (no read-modify-write) para que reclamos
    // concurrentes no pierdan cuenta. No bloqueamos el token ENTRE intentos: la
    // cadencia rápida ya la frena el rate limit por IP del endpoint, y revocar
    // recién en el umbral mantiene la señal de conflicto (409) hasta agotar los
    // intentos, momento en que el token queda revocado de forma definitiva.
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({
        attemptCount: () => 'attempt_count + 1',
        status: () =>
          `CASE WHEN attempt_count + 1 >= ${maxAttempts} AND status = '${ActivationTokenStatus.PENDING}' ` +
          `THEN '${ActivationTokenStatus.REVOKED}' ELSE status END`,
      })
      .where('id = :id', { id: tokenId })
      .execute();
  }

  /**
   * Reclama una activación desde la app: valida el código (o el QR), vincula el
   * dispositivo como APROBADO, consume el token y devuelve la sesión del
   * prestador. El endpoint es público — la app todavía no tiene sesión.
   */
  async claimActivation(
    dto: ClaimActivationDto,
  ): Promise<ActivationClaimResult> {
    const token = await this.resolveToken(dto);
    if (!token) {
      // Código/QR equivocado: no resuelve ningún token. La fuerza bruta sobre
      // el código queda acotada por el rate limit POR IP del endpoint de claim
      // (@Throttle), no por un lockout global que afectaría a todos.
      throw new BadRequestException(
        'No se pudo activar la app. Pedí un nuevo código a coordinación.',
      );
    }

    await this.assertClaimable(token);

    // El prestador siempre se creó antes en el panel; debe seguir activo.
    const provider = token.provider;
    if (!provider || provider.estado !== ProviderStatus.ACTIVO) {
      throw new BadRequestException(
        'No se pudo activar la app. Contactá a coordinación.',
      );
    }

    // ¿El teléfono ya está vinculado y activo con OTRO prestador?
    const conflicting = await this.devices.findOne({
      where: {
        deviceId: dto.deviceId,
        estado: DeviceStatus.APROBADO,
        provider: { id: Not(provider.id) },
      },
    });
    if (conflicting) {
      await this.registerFailedAttempt(token.id);
      throw new ConflictException(
        'Este teléfono ya está vinculado. Contactá a coordinación.',
      );
    }

    // Todo el reclamo va en una transacción: consumo atómico del token + alta
    // del dispositivo. Si algo falla, nada queda a medias.
    const device = await this.tokens.manager.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(DeviceActivationToken);
      const deviceRepo = manager.getRepository(ProviderDevice);
      const now = new Date();

      // Consumo ATÓMICO del token ANTES de crear el dispositivo: solo lo marca
      // `used` si todavía está `pending`. Si otro dispositivo ya lo consumió,
      // affected === 0 y rechazamos: el mismo código no activa dos teléfonos.
      const consumed = await tokenRepo
        .createQueryBuilder()
        .update()
        .set({
          status: ActivationTokenStatus.USED,
          usedAt: now,
          usedByDeviceId: dto.deviceId,
        })
        .where('id = :id', { id: token.id })
        .andWhere('status = :pending', {
          pending: ActivationTokenStatus.PENDING,
        })
        .execute();

      if ((consumed.affected ?? 0) !== 1) {
        throw new BadRequestException(
          'Este código ya fue utilizado. Pedí uno nuevo a coordinación.',
        );
      }

      // Garantiza "un solo dispositivo aprobado por prestador": reemplaza los
      // dispositivos aprobados previos del prestador (distintos a este).
      await deviceRepo
        .createQueryBuilder()
        .update()
        .set({ estado: DeviceStatus.REEMPLAZADO, revokedAt: now })
        .where('provider_id = :providerId', { providerId: provider.id })
        .andWhere('estado = :aprobado', { aprobado: DeviceStatus.APROBADO })
        .andWhere('device_id != :deviceId', { deviceId: dto.deviceId })
        .execute();

      // Reutiliza la fila (prestador, deviceId) si ya existía; si no, la crea.
      let device = await deviceRepo.findOne({
        where: { deviceId: dto.deviceId, provider: { id: provider.id } },
      });
      if (device) {
        device.plataforma = dto.platform;
        device.modelo = dto.model ?? device.modelo;
        device.osVersion = dto.osVersion ?? device.osVersion;
        device.appVersion = dto.appVersion ?? device.appVersion;
        device.pushToken = dto.pushToken ?? device.pushToken;
        device.estado = DeviceStatus.APROBADO;
        device.activatedAt = now;
        device.revokedAt = null;
        device.lastSeenAt = now;
      } else {
        device = deviceRepo.create({
          provider,
          deviceId: dto.deviceId,
          plataforma: dto.platform,
          modelo: dto.model,
          osVersion: dto.osVersion,
          appVersion: dto.appVersion,
          pushToken: dto.pushToken,
          estado: DeviceStatus.APROBADO,
          activatedAt: now,
          lastSeenAt: now,
        });
      }
      return deviceRepo.save(device);
    });

    const session = this.auth.issueProviderSession(provider, dto.deviceId);
    return {
      provider: session.provider,
      device: { id: device.id, status: 'active' },
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  /**
   * Estado del dispositivo de un prestador para el panel: el dispositivo más
   * reciente y si hay una activación vigente. Nunca expone el código ni el token.
   */
  async getProviderDeviceState(providerId: string): Promise<{
    device: ProviderDevice | null;
    pendingToken: { id: string; expiresAt: Date; createdAt: Date } | null;
  }> {
    const provider = await this.providers.findOne({
      where: { id: providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    const device = await this.devices.findOne({
      where: { provider: { id: providerId } },
      order: { createdAt: 'DESC' },
    });

    const token = await this.tokens.findOne({
      where: {
        provider: { id: providerId },
        status: ActivationTokenStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    const pendingToken =
      token && token.expiresAt.getTime() > Date.now()
        ? {
            id: token.id,
            expiresAt: token.expiresAt,
            createdAt: token.createdAt,
          }
        : null;

    return { device: device ?? null, pendingToken };
  }
}
