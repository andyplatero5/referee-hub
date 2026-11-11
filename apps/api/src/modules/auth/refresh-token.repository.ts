import { Injectable } from '@nestjs/common';
import type { RefreshToken } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /**
   * Rota el token: revoca el actual y crea el siguiente en una sola transacción.
   * Devuelve false si el token ya estaba revocado (otra petición lo usó antes).
   */
  rotate(current: RefreshToken, nextHash: string, nextExpiresAt: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const revoked = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: now, rotatedAt: now },
      });
      if (revoked.count !== 1) return false;
      await tx.refreshToken.create({
        data: { userId: current.userId, tokenHash: nextHash, expiresAt: nextExpiresAt },
      });
      return true;
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
