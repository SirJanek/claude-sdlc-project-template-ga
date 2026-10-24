import { describe, expect, it } from 'vitest';
import { emailLinkStartSchema } from './email-link-start.schema';

describe('emailLinkStartSchema', () => {
  it('normalises the e-mail and keeps the optional intent role and return path', () => {
    expect(emailLinkStartSchema.parse({ email: '  Anna@Example.COM ' })).toEqual({ email: 'anna@example.com' });
    expect(emailLinkStartSchema.parse({ email: 'a@b.io', intentRole: 'mentor', next: '/mentors/1' })).toEqual({
      email: 'a@b.io',
      intentRole: 'mentor',
      next: '/mentors/1',
    });
  });

  it('never accepts admin (or any role but mentor) as an intent — an admin is only promoted by the CLI', () => {
    for (const intentRole of ['admin', 'mentee', 'owner', ''])
      expect(emailLinkStartSchema.safeParse({ email: 'a@b.io', intentRole }).success, intentRole).toBe(false);
  });

  it('rejects an invalid e-mail, an off-site return path, and strips unknown keys', () => {
    expect(emailLinkStartSchema.safeParse({ email: 'nope' }).success).toBe(false);
    expect(emailLinkStartSchema.safeParse({ email: 'a@b.io', next: 'https://evil.com' }).success).toBe(false);
    expect(emailLinkStartSchema.safeParse({}).success).toBe(false);
    expect(Object.keys(emailLinkStartSchema.parse({ email: 'a@b.io', role: 'admin', id: 'x' }))).toEqual(['email']);
  });
});
