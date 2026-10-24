import { z } from 'zod';

/** A raw token is 32 random bytes in base64url: exactly 43 characters of that alphabet. */
export const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Input of POST /api/auth/email/consume (the token from the `/auth/confirm?token=` link). */
export const emailLinkConsumeSchema = z.object({
  token: z.string().regex(RAW_TOKEN_PATTERN, 'Invalid token.'),
});

export type EmailLinkConsumeInput = z.infer<typeof emailLinkConsumeSchema>;
