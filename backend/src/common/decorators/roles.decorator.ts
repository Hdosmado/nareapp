import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';

export const ROLES_KEY = 'roles';

/** Restringe una ruta del panel a los roles indicados. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
