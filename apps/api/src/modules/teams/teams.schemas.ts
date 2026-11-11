import { z } from 'zod';
import { paginationShape } from '../../common/pagination';

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
  club: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100).nullish(),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = createTeamSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Indica al menos un campo.' });
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const listTeamsQuerySchema = z.object({
  ...paginationShape,
  q: z.string().trim().max(100).optional(),
});
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
