import { z } from 'zod';

/** Query parameter that carries a one-time account notice to the landing page after sign-in. */
export const ACCOUNT_NOTICE_PARAM = 'notice';

/**
 * Notices a landing page may show once, right after a link was consumed (spec › Flows 3). Only known
 * values render anything: the parameter comes from the URL, so a page never echoes it as text.
 * `existing_account` — a mentor sign-up link was used for an e-mail that already had an account.
 */
export const accountNoticeSchema = z.literal('existing_account');

export type AccountNotice = z.infer<typeof accountNoticeSchema>;
