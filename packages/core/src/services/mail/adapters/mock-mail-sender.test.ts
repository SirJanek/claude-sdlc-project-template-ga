import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../../logger';
import { MockMailSender } from './mock-mail-sender';

const message = {
  to: 'ann@example.com',
  subject: 'Your MentorHub sign-in link',
  text: 'Open http://localhost:3000/auth/confirm?token=SECRET-TOKEN-VALUE within 15 minutes',
};

function capture() {
  const lines: string[] = [];
  return { lines, logger: createLogger({ destination: { write: (line: string) => void lines.push(line) } }) };
}

describe('MockMailSender', () => {
  it('appends every message as one JSON line to the outbox file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'mentorhub-outbox-')), 'outbox.jsonl');
    const sender = new MockMailSender({ env: { MAIL_OUTBOX_FILE: file }, logger: capture().logger });
    await sender.send(message);
    await sender.send({ ...message, to: 'bob@example.com' });
    const rows = readFileSync(file, 'utf8')
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line) as typeof message);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject(message);
    expect(rows[1]?.to).toBe('bob@example.com');
    expect(rows[0]).toHaveProperty('sentAt');
  });

  it('logs a line without the recipient, the token or the body; writes no file when none is configured', async () => {
    const { lines, logger } = capture();
    await new MockMailSender({ env: {}, logger }).send(message);
    const out = lines.join('');
    expect(out).toContain('mail sent');
    expect(out).toContain('[redacted]');
    expect(out).toContain(message.subject);
    expect(out).not.toContain('SECRET-TOKEN-VALUE');
    expect(out).not.toContain('ann@example.com');
    expect(out).not.toContain('auth/confirm');
  });
});
