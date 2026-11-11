import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Roles } from '../../common/auth/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createUserSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
} from './users.schemas';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuarios (filtros: role, isActive, q)' })
  list(@Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un usuario' })
  @ApiBody({ schema: z.toJSONSchema(createUserSchema, { io: 'input' }) as object })
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.users.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un usuario' })
  get(@Param('id', new ZodValidationPipe(idParamSchema)) id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Edita nombre, rol o estado activo' })
  @ApiBody({ schema: z.toJSONSchema(updateUserSchema, { io: 'input' }) as object })
  update(
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.users.update(id, body);
  }
}
