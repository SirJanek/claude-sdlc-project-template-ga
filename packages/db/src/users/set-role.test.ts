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
  /** The row is only ever changed by the UPDATE statement, like in the real database. */
  function fakeEm(rows: { email: string; role: string; sessionVersion: number }[]) {
    const executed: unknown[][] = [];
    const em = {
      findOne: async (_entity: unknown, where: { email: string }) => {
        const row = rows.find((r) => r.email === where.email);
        return row ? { ...row } : null;
      },
      execute: async (sql: string, params: [string, string]) => {
        executed.push([sql, params]);
        const row = rows.find((r) => r.email === params[1])!;
        row.role = params[0];
        row.sessionVersion += 1;
        return [{ session_version: row.sessionVersion }];
      },
    } as unknown as EntityManager;
    return { em, executed };
  }

  it('changes the role and bumps the session version in one atomic UPDATE, and reports it', async () => {
    const row = { email: 'ann@example.com', role: 'mentee', sessionVersion: 2 };
    const { em, executed } = fakeEm([row]);
    const line = await setRole(em, 'ann@example.com', 'mentor');
    expect(row).toEqual({ email: 'ann@example.com', role: 'mentor', sessionVersion: 3 });
    expect(executed).toEqual([
      [
        'update users set role = ?, session_version = session_version + 1, updated_at = now() where email = ? returning session_version',
        ['mentor', 'ann@example.com'],
      ],
    ]);
    expect(line).toBe('ann@example.com: mentee → mentor (session version 3; every session of this account was ended)');
  });

  it('fails for an unknown e-mail without writing', async () => {
    const { em, executed } = fakeEm([]);
    await expect(setRole(em, 'ghost@example.com', 'admin')).rejects.toThrow('No user with e-mail "ghost@example.com".');
    expect(executed).toEqual([]);
  });
});
