import { describe, expect, it } from 'vitest';
import { createLogger } from './logger';

describe('logger', () => {
  it('redacts passwords, tokens, JWTs, authorization and cookies', () => {
    const lines: string[] = [];
    const log = createLogger({ destination: { write: (line: string) => void lines.push(line) } });
    log.info(
      {
        password: 'p4ss',
        user: { token: 't0k', jwt: 'eyJ' },
        req: { headers: { authorization: 'Bearer x', cookie: 'sid=1' } },
      },
      'login',
    );
    const out = lines.join('');
    for (const secret of ['p4ss', 't0k', 'eyJ', 'Bearer x', 'sid=1']) expect(out).not.toContain(secret);
    expect(out).toContain('[redacted]');
  });
});
