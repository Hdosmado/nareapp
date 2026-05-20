import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ProviderStatus, UserStatus } from '../../common/enums';
import {
  JwtPayload,
  SubjectType,
} from '../../common/interfaces/jwt-payload.interface';
import { Provider } from '../providers/entities/provider.entity';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ProviderLoginResult extends AuthTokens {
  provider: {
    id: string;
    apellido: string;
    nombre: string;
    tipoPrestador: string;
  };
}

export interface UserLoginResult extends AuthTokens {
  user: { id: string; nombre: string; rol: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Autentica a un prestador desde la app mobile. */
  async loginProvider(dto: LoginDto): Promise<ProviderLoginResult> {
    const provider = await this.providers
      .createQueryBuilder('p')
      .addSelect('p.passwordHash')
      .where('LOWER(p.email) = LOWER(:email)', { email: dto.email })
      .getOne();

    if (
      !provider?.passwordHash ||
      !(await bcrypt.compare(dto.password, provider.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (provider.estado !== ProviderStatus.ACTIVO) {
      throw new UnauthorizedException('El prestador no se encuentra activo');
    }

    const tokens = this.signTokens({
      sub: provider.id,
      type: 'provider',
      email: provider.email,
    });
    return {
      ...tokens,
      provider: {
        id: provider.id,
        apellido: provider.apellido,
        nombre: provider.nombre,
        tipoPrestador: provider.tipoPrestador,
      },
    };
  }

  /** Autentica a un usuario del panel de coordinación. */
  async loginUser(dto: LoginDto): Promise<UserLoginResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email: dto.email })
      .getOne();

    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (user.estado !== UserStatus.ACTIVO) {
      throw new UnauthorizedException('El usuario no se encuentra activo');
    }

    const tokens = this.signTokens({
      sub: user.id,
      type: 'user',
      email: user.email,
      rol: user.rol,
    });
    return {
      ...tokens,
      user: { id: user.id, nombre: user.nombre, rol: user.rol },
    };
  }

  /** Renueva el par de tokens a partir de un refresh token válido. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let decoded: { sub: string; type: SubjectType };
    try {
      decoded = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (decoded.type === 'provider') {
      const provider = await this.providers.findOne({
        where: { id: decoded.sub },
      });
      if (!provider || provider.estado !== ProviderStatus.ACTIVO) {
        throw new UnauthorizedException('Prestador no disponible');
      }
      return this.signTokens({
        sub: provider.id,
        type: 'provider',
        email: provider.email,
      });
    }

    const user = await this.users.findOne({ where: { id: decoded.sub } });
    if (!user || user.estado !== UserStatus.ACTIVO) {
      throw new UnauthorizedException('Usuario no disponible');
    }
    return this.signTokens({
      sub: user.id,
      type: 'user',
      email: user.email,
      rol: user.rol,
    });
  }

  private signTokens(payload: JwtPayload): AuthTokens {
    const accessToken = this.jwt.sign(payload, {
      secret:
        this.config.get<string>('jwt.accessSecret') ?? 'dev-access-secret',
      expiresIn: (this.config.get<string>('jwt.accessTtl') ??
        '30m') as JwtSignOptions['expiresIn'],
    });
    const refreshToken = this.jwt.sign(
      { sub: payload.sub, type: payload.type },
      {
        secret:
          this.config.get<string>('jwt.refreshSecret') ??
          'dev-refresh-secret',
        expiresIn: (this.config.get<string>('jwt.refreshTtl') ??
          '30d') as JwtSignOptions['expiresIn'],
      },
    );
    return { accessToken, refreshToken };
  }
}
