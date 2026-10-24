import { z } from 'zod';
import { nextPathSchema } from './next-path.schema';

/**
 * Input of POST /api/auth/email/start. The e-mail is normalised like userCreateSchema (unique index
 * is case-sensitive). `intentRole` accepts only `mentor`: a mentee needs no intent and an admin can
 * never be requested (spec › Edge Cases). Unknown keys are stripped.
 */
export const emailLinkStartSchema = z.object({
  email: z.string().trim().toLowerCase().max(320).pipe(z.email()),
  intentRole: z.literal('mentor').optional(),
  next: nextPathSchema.optional(),
});

export type EmailLinkStartInput = z.infer<typeof emailLinkStartSchema>;
