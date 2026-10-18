import type { EntityManager } from '@mikro-orm/postgresql';

const REVOKE_SQL = 'update users set session_version = session_version + 1 where id = ? returning session_version';

/**
 * Ends every session of a user by bumping `session_version` **in the database** (`+ 1` in one UPDATE,
 * never read-then-write): concurrent revocations cannot lose each other's increment, so a cookie
 * issued between two revocations is ended too (review finding 3). Returns the new version, or
 * `null` when no such user exists.
 */
export async function revokeSessions(em: EntityManager, userId: string): Promise<number | null> {
  const rows = await em.execute<{ session_version: number }[]>(REVOKE_SQL, [userId]);
  return rows[0] ? Number(rows[0].session_version) : null;
}
