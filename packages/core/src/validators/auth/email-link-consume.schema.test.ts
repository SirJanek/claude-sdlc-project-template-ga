import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { emailLinkConsumeSchema } from './email-link-consume.schema';

describe('emailLinkConsumeSchema', () => {
  it('accepts exactly a 32-byte base64url token and nothing else', () => {
    const token = randomBytes(32).toString('base64url');
    expect(emailLinkConsumeSchema.parse({ token, extra: 1 })).toEqual({ token });
    for (const bad of ['', token.slice(1), `${token}a`, token.replace(/./, '+'), 'x'.repeat(43).replace('x', ' ')])
      expect(emailLinkConsumeSchema.safeParse({ token: bad }).success, bad).toBe(false);
    expect(emailLinkConsumeSchema.safeParse({}).success).toBe(false);
  });
});
