import { appendFile } from 'node:fs/promises';
import type { Logger } from 'pino';
import type { MailMessage, MailSender } from '../mail-sender.port';

/**
 * Development/test adapter: logs that a message was "sent" (recipient redacted, body never logged —
 * it carries the sign-in link) and, when MAIL_OUTBOX_FILE is set, appends the message as one JSON
 * line so the integration suite can read the link back. Refused in production by env.ts.
 */
export class MockMailSender implements MailSender {
  private readonly logger: Logger;
  private readonly outboxFile: string | undefined;

  constructor({ env, logger }: { env: { MAIL_OUTBOX_FILE?: string }; logger: Logger }) {
    this.logger = logger;
    this.outboxFile = env.MAIL_OUTBOX_FILE;
  }

  async send(message: MailMessage): Promise<void> {
    if (this.outboxFile) {
      await appendFile(
        this.outboxFile,
        `${JSON.stringify({ ...message, sentAt: new Date().toISOString() })}\n`,
        'utf8',
      );
    }
    // `email` is in REDACTED_PATHS; the text (with the link) is deliberately not part of the line.
    this.logger.info({ event: 'mail.sent', adapter: 'mock', email: message.to, subject: message.subject }, 'mail sent');
  }
}
