import type { Role } from '@prisma/client';
import type { Request } from 'express';

// Usuario autenticado que los guards dejan en la petición.
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
