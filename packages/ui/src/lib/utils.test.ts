import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conflicting Tailwind classes, later wins', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    const hidden = process.env.NEVER_SET === '1';
    expect(cn('text-sm', hidden && 'hidden', undefined)).toBe('text-sm');
  });
});
