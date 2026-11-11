import { Injectable } from '@nestjs/common';
import type { Prisma, Team } from '@prisma/client';
import { skipFor } from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateTeamInput, ListTeamsQuery, UpdateTeamInput } from './teams.schemas';

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Team | null> {
    return this.prisma.team.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Team | null> {
    return this.prisma.team.findUnique({ where: { name } });
  }

  create(data: CreateTeamInput): Promise<Team> {
    return this.prisma.team.create({ data });
  }

  update(id: string, data: UpdateTeamInput): Promise<Team> {
    return this.prisma.team.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.team.delete({ where: { id } });
  }

  async list(query: ListTeamsQuery): Promise<{ items: Team[]; total: number }> {
    const where: Prisma.TeamWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { club: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: skipFor(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);
    return { items, total };
  }
}
