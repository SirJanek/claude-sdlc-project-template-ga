import { fileURLToPath } from 'node:url';
import { Migrator } from '@mikro-orm/migrations';
import type { Options } from '@mikro-orm/postgresql';
import { createOrmConfig, type DbEnv } from '../config';

export type MigrationCommand = 'up' | 'down' | 'create' | 'status';

/** The subset of MikroORM's migrator the CLI uses (lets tests pass a fake). */
export interface MigratorLike {
  up(): Promise<{ name: string }[]>;
  down(): Promise<{ name: string }[]>;
  create(
    path?: string,
    blank?: boolean,
    initial?: boolean,
    name?: string,
  ): Promise<{ fileName: string; diff: { up: string[] } }>;
  getExecuted(): Promise<{ name: string }[]>;
  getPending(): Promise<{ name: string }[]>;
}

/** ORM config for migration scripts: the app config plus the Migrator extension and file location. */
export function createMigrationConfig(env: DbEnv = process.env): Options {
  return createOrmConfig(env, {
    debug: false,
    extensions: [Migrator],
    migrations: {
      path: fileURLToPath(new URL('../migrations', import.meta.url)),
      glob: '!(*.d).{js,ts}',
      emit: 'ts',
      snapshot: true,
    },
  });
}

const names = (items: { name: string }[]) => items.map((item) => item.name).join(', ');

/** Runs one migration command and returns the lines to print. Throws on an unknown command. */
export async function runMigrationCommand(migrator: MigratorLike, command: string, name?: string): Promise<string[]> {
  switch (command) {
    case 'up': {
      const done = await migrator.up();
      return [done.length ? `Applied: ${names(done)}` : 'No pending migrations.'];
    }
    case 'down': {
      const done = await migrator.down();
      return [done.length ? `Reverted: ${names(done)}` : 'Nothing to revert.'];
    }
    case 'create': {
      const result = await migrator.create(undefined, false, false, name);
      return [result.diff.up.length ? `Created ${result.fileName}` : 'No schema changes — no migration created.'];
    }
    case 'status': {
      const [executed, pending] = await Promise.all([migrator.getExecuted(), migrator.getPending()]);
      return [`Executed: ${names(executed) || '—'}`, `Pending:  ${names(pending) || '—'}`];
    }
    default:
      throw new Error(`Unknown command "${command}". Use up | down | create | status.`);
  }
}
