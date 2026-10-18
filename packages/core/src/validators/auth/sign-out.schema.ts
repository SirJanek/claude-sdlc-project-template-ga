import { z } from 'zod';

/** Input of POST /api/auth/sign-out: `everywhere` also ends every other session of the account. */
export const signOutSchema = z.object({
  everywhere: z.boolean().optional(),
});

export type SignOutInput = z.infer<typeof signOutSchema>;
