import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/** Restringe una ruta a sujetos de tipo prestador (app mobile). */
@Injectable()
export class ProviderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>().user;
    if (!user || user.type !== 'provider') {
      throw new ForbiddenException('Recurso exclusivo de prestadores');
    }
    return true;
  }
}
