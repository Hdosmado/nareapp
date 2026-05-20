import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Verifica que el usuario autenticado sea del panel (`type === 'user'`) y
 * tenga alguno de los roles requeridos por `@Roles(...)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const user = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>().user;

    if (
      !user ||
      user.type !== 'user' ||
      !required.includes(user.rol as UserRole)
    ) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
