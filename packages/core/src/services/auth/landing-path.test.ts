import { describe, expect, it } from 'vitest';
import { nextPathSchema } from '../../validators/auth/next-path.schema';
import { MENTOR_PROFILE_PATH, defaultLandingPath, withAccountNotice } from './landing-path';

describe('defaultLandingPath', () => {
  it('sends mentors to profile setup and everyone else to the root', () => {
    expect(defaultLandingPath('mentor')).toBe(MENTOR_PROFILE_PATH);
    expect(MENTOR_PROFILE_PATH).toBe('/mentor/profile');
    expect(defaultLandingPath('mentee')).toBe('/');
    expect(defaultLandingPath('admin')).toBe('/');
  });
});

describe('withAccountNotice', () => {
  it('adds the notice parameter, keeping an existing query string and hash', () => {
    expect(withAccountNotice('/', 'existing_account')).toBe('/?notice=existing_account');
    expect(withAccountNotice('/mentor/profile', 'existing_account')).toBe('/mentor/profile?notice=existing_account');
    expect(withAccountNotice('/mentors/7?slot=1#top', 'existing_account')).toBe(
      '/mentors/7?slot=1&notice=existing_account#top',
    );
  });

  it('never lets URL normalisation of dot segments produce a protocol-relative destination (PR #47 review, finding 1)', () => {
    // `new URL('/a/..//evil.example', base).pathname` is `//evil.example`; the validated string must be kept as is.
    for (const [path, expected] of [
      ['/a/..//evil.example', '/a/..//evil.example?notice=existing_account'],
      ['/a/%2e%2e//evil.example', '/a/%2e%2e//evil.example?notice=existing_account'],
      ['/a/../b', '/a/../b?notice=existing_account'],
      ['/a/..//evil.example?x=1#f', '/a/..//evil.example?x=1&notice=existing_account#f'],
    ] as const) {
      expect(nextPathSchema.safeParse(path).success, path).toBe(true); // what the schema lets through
      const result = withAccountNotice(path, 'existing_account');
      expect(result, path).toBe(expected);
      expect(result.startsWith('//'), path).toBe(false);
      expect(nextPathSchema.safeParse(result).success, path).toBe(true);
    }
  });

  it('falls back to the root with the notice when the joined string would leave the origin (defence in depth)', () => {
    // Not reachable through nextPathSchema (it rejects these), but withAccountNotice must never relay them.
    for (const path of ['//evil.example', '/\\evil.example', 'https://evil.example', '/ok\n'])
      expect(withAccountNotice(path, 'existing_account'), path).toBe('/?notice=existing_account');
  });

  it('keeps the result a same-origin relative path (still passes nextPathSchema)', () => {
    for (const path of ['/', '/a/b?c=d', '/x#y', '/mentors/7?slot=2026-10-20T10:00'])
      expect(nextPathSchema.safeParse(withAccountNotice(path, 'existing_account')).success, path).toBe(true);
  });
});
