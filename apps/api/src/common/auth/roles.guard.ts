import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { forbidden } from '../errors/domain-error';
import type { AuthenticatedRequest } from './auth.types';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';

// Autorización por rol. Corre después de JwtAuthGuard, que deja request.user.
// La autorización por recurso (un árbitro solo accede a lo suyo) vive en cada servicio.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!required.includes(user.role)) throw forbidden();
    return true;
  }
}
