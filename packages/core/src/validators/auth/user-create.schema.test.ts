import { describe, expect, it } from 'vitest';
import { userCreateSchema } from './user-create.schema';

describe('userCreateSchema', () => {
  it('trims and lower-cases the email, trims the name, defaults the role to mentee', () => {
    expect(userCreateSchema.parse({ email: '  Anna@Example.COM ', name: '  Anna ' })).toEqual({
      email: 'anna@example.com',
      name: 'Anna',
      role: 'mentee',
    });
  });

  it('accepts every known role and rejects an unknown one', () => {
    for (const role of ['mentee', 'mentor', 'admin']) {
      expect(userCreateSchema.parse({ email: 'a@b.io', name: 'A', role }).role).toBe(role);
    }
    expect(userCreateSchema.safeParse({ email: 'a@b.io', name: 'A', role: 'owner' }).success).toBe(false);
  });

  it('strips unknown keys (no mass assignment)', () => {
    const parsed = userCreateSchema.parse({ email: 'a@b.io', name: 'A', id: 'x', createdAt: '2020-01-01' });
    expect(Object.keys(parsed).sort()).toEqual(['email', 'name', 'role']);
  });

  it('enforces bounds and the email format', () => {
    const base = { email: 'a@b.io', name: 'A' };
    expect(userCreateSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, email: `${'a'.repeat(320)}@b.io` }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, name: 'n'.repeat(121) }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, name: 'n'.repeat(120) }).success).toBe(true);
    expect(userCreateSchema.safeParse({}).success).toBe(false);
  });
});
