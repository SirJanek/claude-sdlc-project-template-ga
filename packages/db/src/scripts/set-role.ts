/**
 * Role CLI entry: `tsx src/scripts/set-role.ts <email> <admin|mentor|mentee>` (`make set-role`).
 * Thin by design (excluded from unit coverage); logic lives in src/users/set-role.ts.
 */
import { createOrm } from '../orm';
import { parseSetRoleArgs, setRole } from '../users/set-role';

let orm: Awaited<ReturnType<typeof createOrm>> | undefined;
try {
  const { email, role } = parseSetRoleArgs(process.argv.slice(2));
  orm = await createOrm();
  console.log(await setRole(orm.em.fork(), email, role));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await orm?.close(true);
}
