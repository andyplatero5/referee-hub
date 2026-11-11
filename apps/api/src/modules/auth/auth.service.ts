import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth.types';
import { unauthorized } from '../../common/errors/domain-error';
import { PasswordService } from '../../common/security/password.service';
import { env } from '../../config';
import { UsersRepository } from '../users/users.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

interface AccessTokenPayload {
  sub: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<SessionTokens> {
    const user = await this.users.findByEmail(email);

    if (user) {
      const passwordOk = await this.passwords.verify(user.passwordHash, password);
      if (passwordOk && user.isActive) return this.startSession(user);
    } else {
      await this.passwords.verifyAgainstDummy(password);
    }
    // Mismo mensaje para correo inexistente, contraseña mala o usuario desactivado.
    throw unauthorized('AUTH_INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }

  /** Cambia un refresh token válido por un par nuevo (rotación). */
  async refresh(rawToken: string | undefined): Promise<SessionTokens> {
    if (!rawToken) throw invalidSession();

    const stored = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (!stored) throw invalidSession();

    // Reutilizar un token ya rotado indica que pudo ser robado: se cierran todas las sesiones.
    if (stored.revokedAt) {
      await this.refreshTokens.revokeAllForUser(stored.userId);
      throw invalidSession();
    }
    if (stored.expiresAt <= new Date()) throw invalidSession();

    const user = await this.users.findById(stored.userId);
    if (!user || !user.isActive) throw invalidSession();

    const next = this.newRefreshToken();
    const rotated = await this.refreshTokens.rotate(stored, next.hash, next.expiresAt);
    if (!rotated) {
      await this.refreshTokens.revokeAllForUser(stored.userId);
      throw invalidSession();
    }
    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: next.raw,
      user: toAuthUser(user),
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const stored = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (stored) await this.refreshTokens.revoke(stored.id);
  }

  /** Valida el access token y devuelve el usuario vigente (rol y estado se leen de la BD). */
  async authenticateAccessToken(token: string): Promise<AuthUser> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw unauthorized('AUTH_TOKEN_INVALID', 'El token es inválido o expiró.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw unauthorized('AUTH_TOKEN_INVALID', 'El token es inválido o expiró.');
    }
    return toAuthUser(user);
  }

  private async startSession(user: User): Promise<SessionTokens> {
    const refresh = this.newRefreshToken();
    await this.refreshTokens.create(user.id, refresh.hash, refresh.expiresAt);
    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: refresh.raw,
      user: toAuthUser(user),
    };
  }

  private signAccessToken(user: User): Promise<string> {
    return this.jwt.signAsync({ sub: user.id } satisfies AccessTokenPayload);
  }

  private newRefreshToken() {
    const raw = randomBytes(48).toString('base64url');
    return {
      raw,
      hash: hashToken(raw),
      expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * DAY_MS),
    };
  }
}

const invalidSession = () =>
  unauthorized('AUTH_SESSION_INVALID', 'La sesión no es válida o expiró. Inicia sesión de nuevo.');
