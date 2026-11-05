import { z } from 'zod';
import { emailSchema } from '../users/users.schemas';

// En el login no se valida la política de contraseñas: solo que venga algo.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;
