import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

const DEFAULT_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

// Postgres responde 23001 (restrict_violation) a un ON DELETE RESTRICT, y Prisma no lo traduce
// al código P2003 de las demás violaciones de clave foránea: se reconoce también por mensaje.
const isForeignKeyViolation = (exception: unknown): boolean =>
  (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2003') ||
  (exception instanceof Prisma.PrismaClientUnknownRequestError &&
    exception.message.includes('violates RESTRICT setting of foreign key constraint'));

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

// Todas las respuestas de error salen con el mismo formato (docs/api.md):
// { error: { code, message, details?, requestId } }
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Error interno del servidor.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = DEFAULT_CODES[status] ?? 'HTTP_ERROR';
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const { code: bodyCode, message: bodyMessage, details: bodyDetails } = body as ErrorBody;
        if (typeof bodyCode === 'string') code = bodyCode;
        if (typeof bodyMessage === 'string') message = bodyMessage;
        if (Array.isArray(bodyMessage)) details = bodyMessage;
        if (bodyDetails !== undefined) details = bodyDetails;
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      // Violación de UNIQUE que ganó la carrera frente a la comprobación previa del servicio.
      status = HttpStatus.CONFLICT;
      code = 'CONFLICT';
      message = 'El recurso ya existe.';
    } else if (isForeignKeyViolation(exception)) {
      // Clave foránea: el registro que se intenta borrar está referenciado por otros.
      status = HttpStatus.CONFLICT;
      code = 'RESOURCE_IN_USE';
      message = 'El recurso está en uso y no puede eliminarse.';
    } else {
      this.logger.error(exception, 'Excepción no controlada');
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
        requestId: request.id,
      },
    });
  }
}
