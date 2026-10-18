import type { EntityManager } from '@mikro-orm/postgresql';
import { User, USER_ROLES, type UserRole } from '../entities';

/**
 * `make set-role EMAIL=… ROLE=admin|mentor|mentee` (spec: accounts and roles › Role CLI). The only
 * way in 1.0 to promote an admin or turn a mentee into a mentor. Bumps the session version so every
 * session of the account ends — the person signs in again with the new role.
 */
export function parseSetRoleArgs(argv: readonly string[]): { email: string; role: UserRole } {
  const [rawEmail, rawRole] = argv;
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !rawRole) throw new Error('Usage: set-role <email> <admin|mentor|mentee>');
  if (!(USER_ROLES as readonly string[]).includes(rawRole)) {
    throw new Error(`Unknown role "${rawRole}". Use one of: ${USER_ROLES.join(', ')}.`);
  }
  return { email, role: rawRole as UserRole };
}

/** Sets the role and bumps the session version; returns the line to print. Throws when the user is unknown. */
export async function setRole(em: EntityManager, email: string, role: UserRole): Promise<string> {
  const user = await em.findOne(User, { email });
  if (!user) throw new Error(`No user with e-mail "${email}".`);
  const previous = user.role;
  user.role = role;
  user.sessionVersion += 1;
  await em.flush();
  return `${email}: ${previous} → ${role} (session version ${user.sessionVersion}; every session of this account was ended)`;
}
