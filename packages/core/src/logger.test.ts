import { describe, expect, it, vi } from 'vitest';
import { createLogger, getLogger } from './logger';

describe('logger', () => {
  it('redacts passwords, tokens, JWTs, authorization and cookies', () => {
    const lines: string[] = [];
    const log = createLogger({ destination: { write: (line: string) => void lines.push(line) } });
    log.info(
      {
        password: 'p4ss',
        user: { token: 't0k', jwt: 'eyJ' },
        req: { headers: { authorization: 'Bearer x', cookie: 'sid=1' } },
        email: 'me@x.io',
        payload: { email: 'you@x.io' },
        mh_session: 'eyJ.session.jwt',
        cookies: { mh_session: 'eyJ.nested.jwt' },
        'set-cookie': 'mh_session=eyJ.set.jwt; Path=/',
        res: { headers: { 'set-cookie': 'mh_session=eyJ.res.jwt' } },
      },
      'login',
    );
    const out = lines.join('');
    for (const secret of [
      'p4ss',
      't0k',
      'eyJ',
      'Bearer x',
      'sid=1',
      'me@x.io',
      'you@x.io',
      'session.jwt',
      'nested.jwt',
      'set.jwt',
      'res.jwt',
    ])
      expect(out).not.toContain(secret);
    expect(out).toContain('[redacted]');
  });
});

describe('getLogger', () => {
  it('returns one shared logger using LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn';
    const first = getLogger();
    expect(first.level).toBe('warn');
    expect(getLogger()).toBe(first);
  });
});

describe('getLogger — default level', () => {
  it('falls back to info when LOG_LEVEL is not set', async () => {
    vi.resetModules();
    delete process.env.LOG_LEVEL;
    const fresh = await import('./logger');
    expect(fresh.getLogger().level).toBe('info');
  });
});
