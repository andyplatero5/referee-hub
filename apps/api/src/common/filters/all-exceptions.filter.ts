import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
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
