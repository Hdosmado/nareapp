import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** Da de alta un usuario del panel de coordinación. */
  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase();
    const exists = await this.users.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        nombre: dto.nombre,
        rol: dto.rol,
        estado: dto.estado,
      }),
    );
    // Se re-consulta para no exponer el passwordHash en la respuesta.
    return this.findOne(user.id);
  }

  /** Lista paginada de usuarios del panel. */
  findAll(pagination: PaginationDto): Promise<User[]> {
    const { page, limit } = pagination;
    return this.users.find({
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  /** Edita un usuario; rehashea la contraseña y valida email duplicado. */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email) {
      const email = dto.email.toLowerCase();
      if (email !== user.email) {
        const exists = await this.users.findOne({ where: { email } });
        if (exists) {
          throw new ConflictException('Ya existe un usuario con ese email');
        }
      }
      user.email = email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.nombre !== undefined) {
      user.nombre = dto.nombre;
    }
    if (dto.rol !== undefined) {
      user.rol = dto.rol;
    }
    if (dto.estado !== undefined) {
      user.estado = dto.estado;
    }

    await this.users.save(user);
    // Se re-consulta para no exponer el passwordHash en la respuesta.
    return this.findOne(id);
  }

  /** Borrado físico del usuario; traduce el error de FK a ConflictException. */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.users.delete(id);
    } catch (error) {
      // 23503 = foreign_key_violation en Postgres: el usuario tiene acciones
      // de coordinación o alertas asignadas sin borrado en cascada.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === '23503'
      ) {
        throw new ConflictException(
          'No se puede eliminar el usuario: tiene acciones de coordinación o alertas asociadas',
        );
      }
      throw error;
    }
  }
}
