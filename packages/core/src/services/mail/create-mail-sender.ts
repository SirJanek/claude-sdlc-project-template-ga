import type { Logger } from 'pino';
import type { Env } from '../../config/env';
import { MockMailSender } from './adapters/mock-mail-sender';
import type { MailSender } from './mail-sender.port';

/** Picks the adapter named by MAIL_ADAPTER (env.ts already refuses test adapters in production). */
export function createMailSender({ env, logger }: { env: Env; logger: Logger }): MailSender {
  // `mock` is the only adapter until the mail-provider spec; the enum in env.ts keeps this exhaustive.
  switch (env.MAIL_ADAPTER) {
    case 'mock':
      return new MockMailSender({ env, logger });
  }
}
