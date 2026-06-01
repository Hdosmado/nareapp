import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * Verifica que el actor sea un ADMIN antes de tocar campos sensibles
   * (`rol`/`estado`). El controller ya restringe el ABM a ADMIN, pero el
   * servicio valida de forma defensiva por si se invoca desde otro lugar.
   */
  private assertAdmin(actor: JwtPayload | undefined): void {
    if (actor?.type !== 'user' || actor.rol !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede asignar el rol o el estado de un usuario',
      );
    }
  }

  /** Da de alta un usuario del panel de coordinación. */
  async create(dto: CreateUserDto, actor?: JwtPayload): Promise<User> {
    // El rol y el estado solo los puede definir un ADMIN.
    if (dto.rol !== undefined || dto.estado !== undefined) {
      this.assertAdmin(actor);
    }

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
  async update(
    id: string,
    dto: UpdateUserDto,
    actor?: JwtPayload,
  ): Promise<User> {
    const user = await this.findOne(id);

    // Solo un ADMIN puede modificar el rol o el estado, y nadie puede editar
    // su propio rol/estado (evita auto-promoción o auto-(des)activación).
    if (dto.rol !== undefined || dto.estado !== undefined) {
      this.assertAdmin(actor);
      if (actor && actor.sub === user.id) {
        throw new ForbiddenException(
          'No podés modificar tu propio rol ni estado',
        );
      }
    }

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
  async remove(id: string, actor?: JwtPayload): Promise<void> {
    await this.findOne(id);
    // Un usuario no puede eliminarse a sí mismo (evita quedarse sin admin
    // o perder la sesión propia de forma accidental).
    if (actor && actor.sub === id) {
      throw new ForbiddenException('No podés eliminar tu propio usuario');
    }
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
