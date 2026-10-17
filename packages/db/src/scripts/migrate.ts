/**
 * Migration CLI: `tsx src/scripts/migrate.ts <up|down|create|status> [name]`.
 * Uses the same config as the app, plus the Migrator extension.
 */
import { fileURLToPath } from 'node:url';
import { Migrator } from '@mikro-orm/migrations';
import { createOrm } from '../orm';
import { createOrmConfig } from '../config';

const command = process.argv[2] ?? 'status';
const name = process.argv[3];

const orm = await createOrm(
  createOrmConfig(process.env, {
    debug: false,
    extensions: [Migrator],
    migrations: {
      path: fileURLToPath(new URL('../migrations', import.meta.url)),
      glob: '!(*.d).{js,ts}',
      emit: 'ts',
      snapshot: true,
    },
  }),
);

try {
  const migrator = orm.migrator;
  if (command === 'up') {
    const done = await migrator.up();
    console.log(done.length ? `Applied: ${done.map((m) => m.name).join(', ')}` : 'No pending migrations.');
  } else if (command === 'down') {
    const done = await migrator.down();
    console.log(done.length ? `Reverted: ${done.map((m) => m.name).join(', ')}` : 'Nothing to revert.');
  } else if (command === 'create') {
    const result = await migrator.create(undefined, false, false, name);
    console.log(result.diff.up.length ? `Created ${result.fileName}` : 'No schema changes — no migration created.');
  } else if (command === 'status') {
    const executed = await migrator.getExecuted();
    const pending = await migrator.getPending();
    console.log(`Executed: ${executed.map((m) => m.name).join(', ') || '—'}`);
    console.log(`Pending:  ${pending.map((m) => m.name).join(', ') || '—'}`);
  } else {
    console.error(`Unknown command "${command}". Use up | down | create | status.`);
    process.exitCode = 1;
  }
} finally {
  await orm.close(true);
}
