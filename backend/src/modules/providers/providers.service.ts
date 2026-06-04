import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProviderStatus } from '../../common/enums';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderRole } from './entities/provider-role.entity';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderRole)
    private readonly roles: Repository<ProviderRole>,
  ) {}

  /** Da de alta un prestador y sus roles operativos. */
  async create(dto: CreateProviderDto): Promise<Provider> {
    const email = dto.email.toLowerCase();
    const exists = await this.providers.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Ya existe un prestador con ese email');
    }

    const dni = dto.dni?.trim();
    if (dni) {
      const dniExists = await this.providers.findOne({ where: { dni } });
      if (dniExists) {
        throw new ConflictException('Ya existe un prestador con ese DNI');
      }
    }

    const provider = await this.providers.save(
      this.providers.create({
        apellido: dto.apellido,
        nombre: dto.nombre,
        tipoPrestador: dto.tipoPrestador,
        telefono: dto.telefono,
        email,
        dni,
        passwordHash: dto.password
          ? await bcrypt.hash(dto.password, 10)
          : undefined,
        estado: ProviderStatus.ACTIVO,
      }),
    );

    const roleList = dto.roles?.length ? dto.roles : [dto.tipoPrestador];
    await this.roles.save(
      roleList.map((rol) => this.roles.create({ provider, rol })),
    );

    return this.findOne(provider.id);
  }

  /** Lista paginada de prestadores. */
  findAll(pagination: PaginationDto): Promise<Provider[]> {
    const { page, limit } = pagination;
    return this.providers.find({
      order: { apellido: 'ASC', nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<Provider> {
    const provider = await this.providers.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }
    return provider;
  }

  /** Edita un prestador; rehashea la contraseña y valida email duplicado. */
  async update(id: string, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.providers.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      if (email !== provider.email) {
        const exists = await this.providers.findOne({ where: { email } });
        if (exists) {
          throw new ConflictException('Ya existe un prestador con ese email');
        }
      }
      provider.email = email;
    }

    if (dto.dni !== undefined) {
      const dni = dto.dni.trim() || null;
      if (dni && dni !== provider.dni) {
        const exists = await this.providers.findOne({ where: { dni } });
        if (exists) {
          throw new ConflictException('Ya existe un prestador con ese DNI');
        }
      }
      provider.dni = dni;
    }

    if (dto.password) {
      provider.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.apellido !== undefined) {
      provider.apellido = dto.apellido;
    }
    if (dto.nombre !== undefined) {
      provider.nombre = dto.nombre;
    }
    if (dto.tipoPrestador !== undefined) {
      provider.tipoPrestador = dto.tipoPrestador;
    }
    if (dto.telefono !== undefined) {
      provider.telefono = dto.telefono;
    }

    await this.providers.save(provider);
    return this.findOne(id);
  }

  /** Borrado físico del prestador; traduce el error de FK a ConflictException. */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.providers.delete(id);
    } catch (error) {
      // 23503 = foreign_key_violation en Postgres: el prestador tiene
      // asignaciones, eventos de asistencia u otros registros operativos.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === '23503'
      ) {
        throw new ConflictException(
          'No se puede eliminar el prestador: tiene registros operativos asociados',
        );
      }
      throw error;
    }
  }
}
