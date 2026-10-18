import { describe, expect, it } from 'vitest';
import type { EntityManager } from '@mikro-orm/postgresql';
import { parseSetRoleArgs, setRole } from './set-role';

describe('parseSetRoleArgs', () => {
  it('normalises the e-mail and accepts every known role', () => {
    expect(parseSetRoleArgs([' Ann@Example.com ', 'admin'])).toEqual({ email: 'ann@example.com', role: 'admin' });
    for (const role of ['mentee', 'mentor', 'admin']) expect(parseSetRoleArgs(['a@b.io', role]).role).toBe(role);
  });

  it('rejects missing arguments and unknown roles with usage hints', () => {
    expect(() => parseSetRoleArgs([])).toThrow(/Usage: set-role <email>/);
    expect(() => parseSetRoleArgs(['a@b.io'])).toThrow(/Usage/);
    expect(() => parseSetRoleArgs(['  ', 'admin'])).toThrow(/Usage/);
    expect(() => parseSetRoleArgs(['a@b.io', 'owner'])).toThrow(
      /Unknown role "owner". Use one of: mentee, mentor, admin/,
    );
    expect(() => parseSetRoleArgs(['a@b.io', 'Admin'])).toThrow(/Unknown role/);
  });
});

describe('setRole', () => {
  function fakeEm(rows: { email: string; role: string; sessionVersion: number }[]) {
    let flushed = 0;
    const em = {
      findOne: async (_entity: unknown, where: { email: string }) => rows.find((r) => r.email === where.email) ?? null,
      flush: async () => {
        flushed += 1;
      },
    } as unknown as EntityManager;
    return { em, flushed: () => flushed };
  }

  it('changes the role, bumps the session version once, flushes and reports it', async () => {
    const row = { email: 'ann@example.com', role: 'mentee', sessionVersion: 2 };
    const { em, flushed } = fakeEm([row]);
    const line = await setRole(em, 'ann@example.com', 'mentor');
    expect(row).toEqual({ email: 'ann@example.com', role: 'mentor', sessionVersion: 3 });
    expect(flushed()).toBe(1);
    expect(line).toBe('ann@example.com: mentee → mentor (session version 3; every session of this account was ended)');
  });

  it('fails for an unknown e-mail without flushing', async () => {
    const { em, flushed } = fakeEm([]);
    await expect(setRole(em, 'ghost@example.com', 'admin')).rejects.toThrow('No user with e-mail "ghost@example.com".');
    expect(flushed()).toBe(0);
  });
});
