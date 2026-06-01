import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/**
 * ABM de usuarios del panel de coordinación.
 * Solo el ADMIN gestiona usuarios: un coordinador no debe poder crear ni
 * editar usuarios (ni auto-promoverse a admin). La verificación de rol y de
 * que nadie edite su propio rol/estado se hace además en el servicio.
 */
@Roles(UserRole.ADMIN)
@Controller('coordination/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateUserDto) {
    return this.users.create(dto, actor);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.users.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param() { id }: IdParamDto) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(
    @Param() { id }: IdParamDto,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParamDto, @CurrentUser() actor: JwtPayload) {
    return this.users.remove(id, actor);
  }
}
