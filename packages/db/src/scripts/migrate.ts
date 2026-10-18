/**
 * Migration CLI entry: `tsx src/scripts/migrate.ts <up|down|create|status> [name]`.
 * Thin by design (excluded from unit coverage); logic lives in src/migrator/run-command.ts and is
 * exercised end to end by the integration suite against a real PostgreSQL.
 */
import { createOrm } from '../orm';
import { createMigrationConfig, runMigrationCommand } from '../migrator/run-command';

const orm = await createOrm(createMigrationConfig());
try {
  for (const line of await runMigrationCommand(orm.migrator, process.argv[2] ?? 'status', process.argv[3]))
    console.log(line);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await orm.close(true);
}
