import { z } from 'zod';
import { paginationShape } from '../../common/pagination';

const licenseNumber = z.string().trim().min(1).max(50);
const licenseExpiresOn = z.iso.date();
const phone = z.string().trim().min(1).max(30).nullable();

export const createRefereeSchema = z.object({
  userId: z.uuid(),
  categoryId: z.number().int().positive(),
  licenseNumber,
  licenseExpiresOn,
  phone: phone.optional(),
});
export type CreateRefereeInput = z.infer<typeof createRefereeSchema>;

export const updateRefereeSchema = z
  .object({
    categoryId: z.number().int().positive(),
    licenseNumber,
    licenseExpiresOn,
    phone,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Indica al menos un campo.' });
export type UpdateRefereeInput = z.infer<typeof updateRefereeSchema>;

export const listRefereesQuerySchema = z.object({
  ...paginationShape,
  categoryId: z.coerce.number().int().positive().optional(),
  licenseValid: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  q: z.string().trim().max(100).optional(),
});
export type ListRefereesQuery = z.infer<typeof listRefereesQuerySchema>;

// Mismo mínimo de 10 caracteres que el resto de los motivos del sistema.
export const declareConflictSchema = z.object({
  teamId: z.uuid(),
  reason: z.string().trim().min(10, 'mínimo 10 caracteres').max(500),
});
export type DeclareConflictInput = z.infer<typeof declareConflictSchema>;
