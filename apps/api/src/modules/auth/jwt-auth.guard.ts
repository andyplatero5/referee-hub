import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../common/auth/auth.types';
import { IS_PUBLIC_KEY } from '../../common/auth/decorators';
import { unauthorized } from '../../common/errors/domain-error';
import { AuthService } from './auth.service';

// Guard global: toda ruta exige un access token válido salvo las marcadas con @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw unauthorized('AUTH_TOKEN_MISSING', 'Falta el token de acceso.');
    }

    request.user = await this.auth.authenticateAccessToken(token);
    return true;
  }
}
