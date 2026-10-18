import { describe, expect, it } from 'vitest';
import { isSameOriginPath, nextPathSchema } from './next-path.schema';

describe('nextPathSchema', () => {
  it('accepts same-origin relative paths with query strings', () => {
    for (const path of ['/', '/mentors/42?slot=2026-10-20T10:00', '/a/b#c', '/ż/ü', `/${'x'.repeat(511)}`])
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

  it('rejects control characters that URL parsers strip before looking for "//" (review finding 1)', () => {
    for (const path of [
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r/evil.example',
      '/\r\n/evil.example',
      '/\0/x',
      '/a\x7fb',
      '/ a',
      '/\t',
    ])
      expect(nextPathSchema.safeParse(path).success, JSON.stringify(path)).toBe(false);
    // The exact escape the review demonstrated: the parser would turn it into https://evil.example/.
    expect(new URL('/\t/evil.example', 'https://mentorhub.test').origin).toBe('https://evil.example');
    expect(isSameOriginPath('/\t/evil.example')).toBe(false);
  });

  it('isSameOriginPath accepts odd but harmless printable input', () => {
    expect(isSameOriginPath('/%')).toBe(true); // the parser accepts a lone percent
    expect(isSameOriginPath('/\u{10FFFF}')).toBe(true); // astral characters are printable (surrogate pairs)
  });
});
