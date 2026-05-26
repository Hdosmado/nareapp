import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AppConfigService } from './app-config.service';
import { CreateAppConfigDto } from './dto/create-app-config.dto';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';
import { AppConfig } from './entities/app-config.entity';

/**
 * ABM de parámetros de configuración desde el panel. Tras cada cambio se
 * refresca la caché en memoria de `AppConfigService` para mantenerla consistente.
 */
@Injectable()
export class AppConfigAdminService {
  constructor(
    @InjectRepository(AppConfig)
    private readonly repo: Repository<AppConfig>,
    private readonly appConfig: AppConfigService,
  ) {}

  /** Da de alta un parámetro de configuración. La key debe ser única. */
  async create(dto: CreateAppConfigDto): Promise<AppConfig> {
    const exists = await this.repo.findOne({ where: { key: dto.key } });
    if (exists) {
      throw new ConflictException(`Ya existe un parámetro con la key ${dto.key}`);
    }
    const config = await this.repo.save(this.repo.create(dto));
    await this.appConfig.refreshCache();
    return config;
  }

  findAll(pagination: PaginationDto): Promise<AppConfig[]> {
    const { page, limit } = pagination;
    return this.repo.find({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<AppConfig> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Parámetro de configuración no encontrado');
    }
    return config;
  }

  /** Actualiza un parámetro de configuración. */
  async update(id: string, dto: UpdateAppConfigDto): Promise<AppConfig> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Parámetro de configuración no encontrado');
    }
    this.repo.merge(config, dto);
    const saved = await this.repo.save(config);
    await this.appConfig.refreshCache();
    return saved;
  }

  /** Elimina físicamente un parámetro de configuración. */
  async remove(id: string): Promise<void> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Parámetro de configuración no encontrado');
    }
    await this.repo.delete(id);
    await this.appConfig.refreshCache();
  }
}
