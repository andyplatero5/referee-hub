import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error de negocio o de autorización con código estable.
 * El filtro global lo serializa como { error: { code, message, details?, requestId } }.
 */
export class DomainError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: unknown) {
    super({ code, message, ...(details !== undefined && { details }) }, status);
  }
}

export const unauthorized = (code: string, message: string) =>
  new DomainError(HttpStatus.UNAUTHORIZED, code, message);

export const forbidden = (message = 'No tienes permiso para realizar esta acción.') =>
  new DomainError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);

export const notFound = (code: string, message: string) =>
  new DomainError(HttpStatus.NOT_FOUND, code, message);

export const conflict = (code: string, message: string) =>
  new DomainError(HttpStatus.CONFLICT, code, message);
