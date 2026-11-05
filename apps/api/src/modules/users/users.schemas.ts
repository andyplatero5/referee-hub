import { z } from 'zod';

export const roleSchema = z.enum(['REFEREE', 'DESIGNATOR', 'ADMIN']);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const createUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(1).max(120),
  role: roleSchema,
  password: z.string().min(10, 'mínimo 10 caracteres').max(128),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    role: roleSchema,
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Indica al menos un campo.' });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: roleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  q: z.string().trim().max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const idParamSchema = z.uuid();
