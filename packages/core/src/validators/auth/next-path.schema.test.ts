import { describe, expect, it } from 'vitest';
import { nextPathSchema } from './next-path.schema';

describe('nextPathSchema', () => {
  it('accepts same-origin relative paths with query strings', () => {
    for (const path of ['/', '/mentors/42?slot=2026-10-20T10:00', '/a/b#c', `/${'x'.repeat(511)}`])
      expect(nextPathSchema.safeParse(path).success, path).toBe(true);
  });

  it('rejects absolute URLs, protocol-relative, backslashes, relative segments and over-long paths (no open redirect)', () => {
    for (const path of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'evil.com',
      'mentors',
      '',
      `/${'x'.repeat(512)}`,
    ])
      expect(nextPathSchema.safeParse(path).success, path).toBe(false);
  });
});
