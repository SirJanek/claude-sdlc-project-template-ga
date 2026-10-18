import { z } from 'zod';
import { USER_ROLES } from '@mentorhub/db';

/**
 * Input of "an admin creates a user". Shared by the route (and a form later). Unknown keys are
 * stripped, so nothing but these fields reaches the service. The email is normalised because the
 * database's unique index is case-sensitive.
 */
export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().max(320).pipe(z.email()),
  name: z.string().trim().min(1).max(120),
  role: z.enum(USER_ROLES).default('mentee'),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
