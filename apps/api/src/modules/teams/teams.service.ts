import { Injectable } from '@nestjs/common';
import type { Team } from '@prisma/client';
import { conflict, notFound } from '../../common/errors/domain-error';
import { pageMeta } from '../../common/pagination';
import { TeamsRepository } from './teams.repository';
import type { CreateTeamInput, ListTeamsQuery, UpdateTeamInput } from './teams.schemas';

const teamNotFound = () => notFound('TEAM_NOT_FOUND', 'El equipo no existe.');
const nameTaken = () => conflict('TEAM_NAME_TAKEN', 'Ya existe un equipo con ese nombre.');

const toDto = (team: Team) => ({
  id: team.id,
  name: team.name,
  club: team.club,
  city: team.city,
});

@Injectable()
export class TeamsService {
  constructor(private readonly teams: TeamsRepository) {}

  async list(query: ListTeamsQuery) {
    const { items, total } = await this.teams.list(query);
    return { data: items.map(toDto), meta: pageMeta(query.page, query.pageSize, total) };
  }

  async get(id: string) {
    const team = await this.teams.findById(id);
    if (!team) throw teamNotFound();
    return toDto(team);
  }

  async create(input: CreateTeamInput) {
    if (await this.teams.findByName(input.name)) throw nameTaken();
    return toDto(await this.teams.create(input));
  }

  async update(id: string, changes: UpdateTeamInput) {
    if (!(await this.teams.findById(id))) throw teamNotFound();
    if (changes.name) {
      const same = await this.teams.findByName(changes.name);
      if (same && same.id !== id) throw nameTaken();
    }
    return toDto(await this.teams.update(id, changes));
  }

  /** Un equipo con conflictos declarados (o, más adelante, partidos) responde 409 RESOURCE_IN_USE. */
  async remove(id: string): Promise<void> {
    if (!(await this.teams.findById(id))) throw teamNotFound();
    await this.teams.delete(id);
  }
}
