import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateProviderRoleDto } from './dto/create-provider-role.dto';
import { UpdateProviderRoleDto } from './dto/update-provider-role.dto';
import { ProviderRole } from './entities/provider-role.entity';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProviderRolesService {
  constructor(
    @InjectRepository(ProviderRole)
    private readonly roles: Repository<ProviderRole>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
  ) {}

  /** Asigna un rol operativo a un prestador existente. */
  async create(dto: CreateProviderRoleDto): Promise<ProviderRole> {
    const provider = await this.providers.findOne({
      where: { id: dto.providerId },
    });
    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }
    return this.roles.save(this.roles.create({ provider, rol: dto.rol }));
  }

  /** Lista paginada de roles de prestadores. */
  findAll(pagination: PaginationDto): Promise<ProviderRole[]> {
    const { page, limit } = pagination;
    return this.roles.find({
      relations: { provider: true },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<ProviderRole> {
    const role = await this.roles.findOne({
      where: { id },
      relations: { provider: true },
    });
    if (!role) {
      throw new NotFoundException('Rol de prestador no encontrado');
    }
    return role;
  }

  /** Edita un rol de prestador. */
  async update(id: string, dto: UpdateProviderRoleDto): Promise<ProviderRole> {
    const role = await this.findOne(id);

    if (dto.providerId !== undefined) {
      const provider = await this.providers.findOne({
        where: { id: dto.providerId },
      });
      if (!provider) {
        throw new NotFoundException('Prestador no encontrado');
      }
      role.provider = provider;
    }
    if (dto.rol !== undefined) {
      role.rol = dto.rol;
    }

    return this.roles.save(role);
  }

  /** Borrado físico del rol de prestador. */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.roles.delete(id);
  }
}
