import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Roles } from '../../common/auth/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createTeamSchema,
  listTeamsQuerySchema,
  updateTeamSchema,
  type CreateTeamInput,
  type ListTeamsQuery,
  type UpdateTeamInput,
} from './teams.schemas';
import { TeamsService } from './teams.service';

const idPipe = new ZodValidationPipe(z.uuid());

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista equipos (cualquier usuario autenticado)' })
  list(@Query(new ZodValidationPipe(listTeamsQuerySchema)) query: ListTeamsQuery) {
    return this.teams.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un equipo' })
  get(@Param('id', idPipe) id: string) {
    return this.teams.get(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crea un equipo (administrador)' })
  @ApiBody({ schema: z.toJSONSchema(createTeamSchema, { io: 'input' }) as object })
  create(@Body(new ZodValidationPipe(createTeamSchema)) body: CreateTeamInput) {
    return this.teams.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Edita un equipo (administrador)' })
  @ApiBody({ schema: z.toJSONSchema(updateTeamSchema, { io: 'input' }) as object })
  update(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateTeamSchema)) body: UpdateTeamInput,
  ) {
    return this.teams.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un equipo sin uso (administrador)' })
  remove(@Param('id', idPipe) id: string) {
    return this.teams.remove(id);
  }
}
