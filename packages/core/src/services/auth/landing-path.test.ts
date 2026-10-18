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

  it('keeps the result a same-origin relative path (still passes nextPathSchema)', () => {
    for (const path of ['/', '/a/b?c=d', '/x#y', '/mentors/7?slot=2026-10-20T10:00'])
      expect(nextPathSchema.safeParse(withAccountNotice(path, 'existing_account')).success, path).toBe(true);
  });
});
