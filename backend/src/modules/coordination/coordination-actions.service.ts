import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateCoordinationActionDto } from './dto/create-coordination-action.dto';
import { UpdateCoordinationActionDto } from './dto/update-coordination-action.dto';
import { CoordinationAction } from './entities/coordination-action.entity';

/** ABM de acciones de coordinación registradas sobre las asignaciones. */
@Injectable()
export class CoordinationActionsService {
  constructor(
    @InjectRepository(CoordinationAction)
    private readonly actions: Repository<CoordinationAction>,
  ) {}

  /** Registra una acción de coordinación sobre una asignación. */
  create(dto: CreateCoordinationActionDto): Promise<CoordinationAction> {
    return this.actions.save(
      this.actions.create({
        assignment: { id: dto.assignmentId },
        coordinator: { id: dto.coordinatorId },
        actionType: dto.actionType,
        notes: dto.notes,
      }),
    );
  }

  findAll(pagination: PaginationDto): Promise<CoordinationAction[]> {
    const { page, limit } = pagination;
    return this.actions.find({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<CoordinationAction> {
    const action = await this.actions.findOne({
      where: { id },
      relations: { assignment: true, coordinator: true },
    });
    if (!action) {
      throw new NotFoundException('Acción de coordinación no encontrada');
    }
    return action;
  }

  /** Actualiza una acción de coordinación. */
  async update(
    id: string,
    dto: UpdateCoordinationActionDto,
  ): Promise<CoordinationAction> {
    const action = await this.actions.findOne({ where: { id } });
    if (!action) {
      throw new NotFoundException('Acción de coordinación no encontrada');
    }
    this.actions.merge(action, {
      actionType: dto.actionType,
      notes: dto.notes,
      ...(dto.assignmentId ? { assignment: { id: dto.assignmentId } } : {}),
      ...(dto.coordinatorId ? { coordinator: { id: dto.coordinatorId } } : {}),
    });
    await this.actions.save(action);
    return this.findOne(id);
  }

  /** Elimina físicamente una acción de coordinación. */
  async remove(id: string): Promise<void> {
    const action = await this.actions.findOne({ where: { id } });
    if (!action) {
      throw new NotFoundException('Acción de coordinación no encontrada');
    }
    await this.actions.delete(id);
  }
}
