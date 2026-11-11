import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { conflict, notFound } from '../../common/errors/domain-error';
import { PasswordService } from '../../common/security/password.service';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schemas';
import { UsersRepository } from './users.repository';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: User['role'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const userNotFound = () => notFound('USER_NOT_FOUND', 'El usuario no existe.');

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
  ) {}

  async list(query: ListUsersQuery) {
    const { items, total } = await this.users.list(query);
    return {
      data: items.map(toPublicUser),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) throw userNotFound();
    return toPublicUser(user);
  }

  async create(input: CreateUserInput): Promise<PublicUser> {
    if (await this.users.findByEmail(input.email)) {
      throw conflict('USER_EMAIL_TAKEN', 'Ya existe un usuario con ese correo.');
    }
    const user = await this.users.create({
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash: await this.passwords.hash(input.password),
    });
    return toPublicUser(user);
  }

  /**
   * Regla: el sistema nunca se queda sin un administrador activo (LAST_ADMIN).
   * Se evalúa dentro de una transacción serializable para que dos cambios
   * simultáneos no dejen a cero a los administradores.
   */
  async update(id: string, changes: UpdateUserInput): Promise<PublicUser> {
    const updated = await this.users.transaction(async (tx) => {
      const current = await tx.findById(id);
      if (!current) throw userNotFound();

      const isActiveAdmin = current.role === 'ADMIN' && current.isActive;
      const staysActiveAdmin =
        (changes.role ?? current.role) === 'ADMIN' && (changes.isActive ?? current.isActive);

      if (isActiveAdmin && !staysActiveAdmin && (await tx.countActiveAdmins()) <= 1) {
        throw conflict(
          'LAST_ADMIN',
          'No puedes desactivar ni quitar el rol al último administrador activo.',
        );
      }

      const user = await tx.update(id, changes);
      if (changes.isActive === false) await tx.revokeRefreshTokens(id);
      return user;
    });
    return toPublicUser(updated);
  }
}
