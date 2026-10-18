import { describe, expect, it } from 'vitest';
import { signOutSchema } from './sign-out.schema';

describe('signOutSchema', () => {
  it('takes an optional boolean `everywhere` and nothing else', () => {
    expect(signOutSchema.parse({})).toEqual({});
    expect(signOutSchema.parse({ everywhere: true, other: 1 })).toEqual({ everywhere: true });
    expect(signOutSchema.safeParse({ everywhere: 'yes' }).success).toBe(false);
  });
});
