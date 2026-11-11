import { Injectable } from '@nestjs/common';
import type { Prisma, RefereeConflict, Team } from '@prisma/client';
import { skipFor } from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { ListRefereesQuery } from './referees.schemas';

const withRelations = { user: true, category: true } satisfies Prisma.RefereeInclude;

export type RefereeWithRelations = Prisma.RefereeGetPayload<{ include: typeof withRelations }>;
export type ConflictWithTeam = RefereeConflict & { team: Team };

export interface NewReferee {
  userId: string;
  categoryId: number;
  licenseNumber: string;
  licenseExpiresOn: Date;
  phone?: string | null;
}

export interface RefereeChanges {
  categoryId?: number;
  licenseNumber?: string;
  licenseExpiresOn?: Date;
  phone?: string | null;
}

@Injectable()
export class RefereesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<RefereeWithRelations | null> {
    return this.prisma.referee.findUnique({ where: { id }, include: withRelations });
  }

  findByUserId(userId: string): Promise<RefereeWithRelations | null> {
    return this.prisma.referee.findUnique({ where: { userId }, include: withRelations });
  }

  findByLicenseNumber(licenseNumber: string): Promise<RefereeWithRelations | null> {
    return this.prisma.referee.findUnique({ where: { licenseNumber }, include: withRelations });
  }

  create(data: NewReferee): Promise<RefereeWithRelations> {
    return this.prisma.referee.create({ data, include: withRelations });
  }

  update(id: string, data: RefereeChanges): Promise<RefereeWithRelations> {
    return this.prisma.referee.update({ where: { id }, data, include: withRelations });
  }

  /** `today` es una fecha (UTC) para filtrar por licencia vigente. */
  async list(
    query: ListRefereesQuery,
    today: Date,
  ): Promise<{ items: RefereeWithRelations[]; total: number }> {
    const where: Prisma.RefereeWhereInput = {
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.licenseValid !== undefined && {
        licenseExpiresOn: query.licenseValid ? { gte: today } : { lt: today },
      }),
      ...(query.q && {
        OR: [
          { licenseNumber: { contains: query.q, mode: 'insensitive' } },
          { user: { fullName: { contains: query.q, mode: 'insensitive' } } },
          { user: { email: { contains: query.q, mode: 'insensitive' } } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.referee.findMany({
        where,
        include: withRelations,
        orderBy: [{ user: { fullName: 'asc' } }, { id: 'asc' }],
        skip: skipFor(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.referee.count({ where }),
    ]);
    return { items, total };
  }

  listConflicts(refereeId: string): Promise<ConflictWithTeam[]> {
    return this.prisma.refereeConflict.findMany({
      where: { refereeId },
      include: { team: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findConflict(refereeId: string, teamId: string): Promise<RefereeConflict | null> {
    return this.prisma.refereeConflict.findUnique({
      where: { refereeId_teamId: { refereeId, teamId } },
    });
  }

  findConflictById(id: string): Promise<RefereeConflict | null> {
    return this.prisma.refereeConflict.findUnique({ where: { id } });
  }

  createConflict(refereeId: string, teamId: string, reason: string): Promise<ConflictWithTeam> {
    return this.prisma.refereeConflict.create({
      data: { refereeId, teamId, reason },
      include: { team: true },
    });
  }

  async deleteConflict(id: string): Promise<void> {
    await this.prisma.refereeConflict.delete({ where: { id } });
  }
}
