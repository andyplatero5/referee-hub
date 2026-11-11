import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth.types';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createRefereeSchema,
  declareConflictSchema,
  listRefereesQuerySchema,
  updateRefereeSchema,
  type CreateRefereeInput,
  type DeclareConflictInput,
  type ListRefereesQuery,
  type UpdateRefereeInput,
} from './referees.schemas';
import { RefereesService } from './referees.service';

const idPipe = new ZodValidationPipe(z.uuid());

@ApiTags('referees')
@ApiBearerAuth()
@Controller('referees')
export class RefereesController {
  constructor(private readonly referees: RefereesService) {}

  @Get()
  @Roles('ADMIN', 'DESIGNATOR')
  @ApiOperation({ summary: 'Lista árbitros (filtros: categoryId, licenseValid, q)' })
  list(@Query(new ZodValidationPipe(listRefereesQuerySchema)) query: ListRefereesQuery) {
    return this.referees.list(query);
  }

  // Va antes de ":id" para que "me" no se interprete como un identificador.
  @Get('me')
  @Roles('REFEREE')
  @ApiOperation({ summary: 'Mi perfil de árbitro' })
  me(@CurrentUser() actor: AuthUser) {
    return this.referees.getMine(actor);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crea el perfil de árbitro de un usuario (administrador)' })
  @ApiBody({ schema: z.toJSONSchema(createRefereeSchema, { io: 'input' }) as object })
  create(@Body(new ZodValidationPipe(createRefereeSchema)) body: CreateRefereeInput) {
    return this.referees.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle (un árbitro solo ve el suyo)' })
  get(@Param('id', idPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.referees.get(id, actor);
  }

  @Patch(':id')
  @Roles('ADMIN', 'REFEREE')
  @HttpCode(200)
  @ApiOperation({ summary: 'Edita el perfil (el árbitro solo puede cambiar su teléfono)' })
  @ApiBody({ schema: z.toJSONSchema(updateRefereeSchema, { io: 'input' }) as object })
  update(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateRefereeSchema)) body: UpdateRefereeInput,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.referees.update(id, body, actor);
  }

  @Get(':id/conflicts')
  @ApiOperation({ summary: 'Conflictos de interés declarados' })
  listConflicts(@Param('id', idPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.referees.listConflicts(id, actor);
  }

  @Post(':id/conflicts')
  @Roles('ADMIN', 'REFEREE')
  @ApiOperation({ summary: 'Declara un conflicto de interés con un equipo' })
  @ApiBody({ schema: z.toJSONSchema(declareConflictSchema, { io: 'input' }) as object })
  declareConflict(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(declareConflictSchema)) body: DeclareConflictInput,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.referees.declareConflict(id, body, actor);
  }

  @Delete(':id/conflicts/:conflictId')
  @Roles('ADMIN', 'REFEREE')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retira un conflicto de interés' })
  removeConflict(
    @Param('id', idPipe) id: string,
    @Param('conflictId', idPipe) conflictId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.referees.removeConflict(id, conflictId, actor);
  }
}
