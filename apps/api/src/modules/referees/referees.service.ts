import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth.types';
import { conflict, DomainError, forbidden, notFound } from '../../common/errors/domain-error';
import { pageMeta } from '../../common/pagination';
import { CategoriesRepository } from '../categories/categories.repository';
import { TeamsRepository } from '../teams/teams.repository';
import { UsersRepository } from '../users/users.repository';
import {
  RefereesRepository,
  type ConflictWithTeam,
  type RefereeChanges,
  type RefereeWithRelations,
} from './referees.repository';
import type {
  CreateRefereeInput,
  DeclareConflictInput,
  ListRefereesQuery,
  UpdateRefereeInput,
} from './referees.schemas';

/** Avisa que la licencia está por vencer cuando faltan menos de estos días. */
const LICENSE_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type LicenseStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

const refereeNotFound = () => notFound('REFEREE_NOT_FOUND', 'El árbitro no existe.');
const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Hoy como fecha UTC sin hora. */
const todayUtc = (): Date => toDate(toIsoDate(new Date()));

/**
 * Estado de la licencia. Una licencia sigue vigente todo el día de su vencimiento
 * (R3), así que "vence hoy" es EXPIRING y no EXPIRED.
 */
export function licenseStatus(expiresOn: Date, today: Date = todayUtc()) {
  const daysRemaining = Math.round((expiresOn.getTime() - today.getTime()) / DAY_MS);
  const status: LicenseStatus =
    daysRemaining < 0 ? 'EXPIRED' : daysRemaining < LICENSE_WARNING_DAYS ? 'EXPIRING' : 'VALID';
  return { status, daysRemaining };
}

const toDto = (referee: RefereeWithRelations) => {
  const license = licenseStatus(referee.licenseExpiresOn);
  return {
    id: referee.id,
    userId: referee.userId,
    fullName: referee.user.fullName,
    email: referee.user.email,
    category: {
      id: referee.category.id,
      name: referee.category.name,
      level: referee.category.level,
    },
    licenseNumber: referee.licenseNumber,
    licenseExpiresOn: toIsoDate(referee.licenseExpiresOn),
    licenseStatus: license.status,
    licenseDaysRemaining: license.daysRemaining,
    phone: referee.phone,
    createdAt: referee.createdAt,
    updatedAt: referee.updatedAt,
  };
};

const toConflictDto = (item: ConflictWithTeam) => ({
  id: item.id,
  team: { id: item.team.id, name: item.team.name, club: item.team.club },
  reason: item.reason,
  createdAt: item.createdAt,
});

@Injectable()
export class RefereesService {
  constructor(
    private readonly referees: RefereesRepository,
    private readonly users: UsersRepository,
    private readonly categories: CategoriesRepository,
    private readonly teams: TeamsRepository,
  ) {}

  async list(query: ListRefereesQuery) {
    const { items, total } = await this.referees.list(query, todayUtc());
    return { data: items.map(toDto), meta: pageMeta(query.page, query.pageSize, total) };
  }

  async getMine(actor: AuthUser) {
    const referee = await this.referees.findByUserId(actor.id);
    if (!referee) {
      throw notFound('REFEREE_PROFILE_NOT_FOUND', 'Todavía no tienes un perfil de árbitro.');
    }
    return toDto(referee);
  }

  async get(id: string, actor: AuthUser) {
    return toDto(await this.getAccessible(id, actor));
  }

  async create(input: CreateRefereeInput) {
    const user = await this.users.findById(input.userId);
    if (!user) throw notFound('USER_NOT_FOUND', 'El usuario no existe.');
    if (user.role !== 'REFEREE') {
      throw new DomainError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'USER_NOT_REFEREE',
        'Solo un usuario con rol de árbitro puede tener perfil de árbitro.',
      );
    }
    if (await this.referees.findByUserId(user.id)) {
      throw conflict('REFEREE_PROFILE_EXISTS', 'Ese usuario ya tiene perfil de árbitro.');
    }
    await this.assertCategoryExists(input.categoryId);
    await this.assertLicenseFree(input.licenseNumber);

    return toDto(
      await this.referees.create({
        userId: user.id,
        categoryId: input.categoryId,
        licenseNumber: input.licenseNumber,
        licenseExpiresOn: toDate(input.licenseExpiresOn),
        phone: input.phone ?? null,
      }),
    );
  }

  /**
   * El administrador edita todo. El propio árbitro solo puede cambiar su teléfono:
   * categoría y licencia son datos oficiales.
   */
  async update(id: string, changes: UpdateRefereeInput, actor: AuthUser) {
    const current = await this.getAccessible(id, actor);

    if (actor.role !== 'ADMIN') {
      const onlyPhone = Object.keys(changes).every((key) => key === 'phone');
      if (!onlyPhone) {
        throw forbidden('Solo el administrador puede cambiar la categoría o la licencia.');
      }
    }
    if (changes.categoryId !== undefined) await this.assertCategoryExists(changes.categoryId);
    if (changes.licenseNumber !== undefined) {
      await this.assertLicenseFree(changes.licenseNumber, current.id);
    }

    const data: RefereeChanges = {
      ...(changes.categoryId !== undefined && { categoryId: changes.categoryId }),
      ...(changes.licenseNumber !== undefined && { licenseNumber: changes.licenseNumber }),
      ...(changes.licenseExpiresOn !== undefined && {
        licenseExpiresOn: toDate(changes.licenseExpiresOn),
      }),
      ...(changes.phone !== undefined && { phone: changes.phone }),
    };
    return toDto(await this.referees.update(current.id, data));
  }

  async listConflicts(refereeId: string, actor: AuthUser) {
    await this.getAccessible(refereeId, actor);
    const items = await this.referees.listConflicts(refereeId);
    return { data: items.map(toConflictDto) };
  }

  async declareConflict(refereeId: string, input: DeclareConflictInput, actor: AuthUser) {
    await this.getAccessible(refereeId, actor);
    if (!(await this.teams.findById(input.teamId))) {
      throw notFound('TEAM_NOT_FOUND', 'El equipo no existe.');
    }
    if (await this.referees.findConflict(refereeId, input.teamId)) {
      throw conflict('CONFLICT_ALREADY_DECLARED', 'Ya declaraste conflicto con ese equipo.');
    }
    return toConflictDto(await this.referees.createConflict(refereeId, input.teamId, input.reason));
  }

  async removeConflict(refereeId: string, conflictId: string, actor: AuthUser): Promise<void> {
    await this.getAccessible(refereeId, actor);
    const found = await this.referees.findConflictById(conflictId);
    if (!found || found.refereeId !== refereeId) {
      throw notFound('CONFLICT_NOT_FOUND', 'El conflicto no existe.');
    }
    await this.referees.deleteConflict(conflictId);
  }

  /**
   * Autorización por recurso: un árbitro solo accede a su propio perfil. Para él, el
   * perfil de otro árbitro responde igual que uno inexistente (404), sin revelar que existe.
   */
  private async getAccessible(id: string, actor: AuthUser): Promise<RefereeWithRelations> {
    const referee = await this.referees.findById(id);
    if (!referee) throw refereeNotFound();
    if (actor.role === 'REFEREE' && referee.userId !== actor.id) throw refereeNotFound();
    return referee;
  }

  private async assertCategoryExists(categoryId: number): Promise<void> {
    if (!(await this.categories.findById(categoryId))) {
      throw notFound('CATEGORY_NOT_FOUND', 'La categoría no existe.');
    }
  }

  private async assertLicenseFree(licenseNumber: string, exceptRefereeId?: string): Promise<void> {
    const same = await this.referees.findByLicenseNumber(licenseNumber);
    if (same && same.id !== exceptRefereeId) {
      throw conflict('LICENSE_NUMBER_TAKEN', 'Ya existe un árbitro con ese número de licencia.');
    }
  }
}
