import { Injectable } from '@nestjs/common';
import { Prisma, type Role, type User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { ListUsersQuery } from './users.schemas';

type DbClient = PrismaService | Prisma.TransactionClient;

export interface NewUser {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}

export interface UserChanges {
  fullName?: string;
  role?: Role;
  isActive?: boolean;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Repositorio ligado a una transacción serializable (para reglas que dependen de conteos). */
  transaction<T>(work: (repo: UsersTxRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(new UsersTxRepository(tx)), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  findById(id: string): Promise<User | null> {
    return new UsersTxRepository(this.prisma).findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: NewUser): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async list(query: ListUsersQuery): Promise<{ items: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.q && {
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { fullName: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }
}

export class UsersTxRepository {
  constructor(private readonly db: DbClient) {}

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  countActiveAdmins(): Promise<number> {
    return this.db.user.count({ where: { role: 'ADMIN', isActive: true } });
  }

  update(id: string, changes: UserChanges): Promise<User> {
    return this.db.user.update({ where: { id }, data: changes });
  }

  async revokeRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
