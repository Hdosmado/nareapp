import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProviderStatus } from '../../common/enums';
import { CreateProviderDto } from './dto/create-provider.dto';
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

    const provider = await this.providers.save(
      this.providers.create({
        apellido: dto.apellido,
        nombre: dto.nombre,
        tipoPrestador: dto.tipoPrestador,
        telefono: dto.telefono,
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
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
}
