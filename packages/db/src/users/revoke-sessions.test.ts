import { describe, expect, it } from 'vitest';
import type { EntityManager } from '@mikro-orm/postgresql';
import { revokeSessions } from './revoke-sessions';

describe('revokeSessions', () => {
  it('increments session_version inside the database with the id bound, and returns the new version', async () => {
    const calls: unknown[][] = [];
    const em = {
      execute: async (sql: string, params: unknown[]) => {
        calls.push([sql, params]);
        return [{ session_version: '4' }];
      },
    } as unknown as EntityManager;
    await expect(revokeSessions(em, 'u1')).resolves.toBe(4);
    expect(calls).toEqual([
      ['update users set session_version = session_version + 1 where id = ? returning session_version', ['u1']],
    ]);
    expect(String(calls[0]![0])).not.toContain('u1'); // bound, never interpolated
  });

  it('returns null for an unknown user', async () => {
    const em = { execute: async () => [] } as unknown as EntityManager;
    await expect(revokeSessions(em, 'ghost')).resolves.toBeNull();
  });
});
