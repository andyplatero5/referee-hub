import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// En el login el contador es por IP + correo, así un atacante no agota el límite
// de otra persona ni prueba muchas contraseñas contra el mismo correo.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
    const url = typeof req.originalUrl === 'string' ? req.originalUrl : '';
    const body = req.body as { email?: unknown } | undefined;

    if (url.endsWith('/auth/login') && typeof body?.email === 'string') {
      return Promise.resolve(`${ip}|${body.email.trim().toLowerCase()}`);
    }
    return Promise.resolve(ip);
  }
}
