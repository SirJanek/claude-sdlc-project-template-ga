import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

const migrate = (command: string, ...args: string[]) =>
  execFileSync(
    'pnpm',
    ['--silent', '--filter', '@mentorhub/db', 'exec', 'tsx', 'src/scripts/migrate.ts', command, ...args],
    {
      env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
      encoding: 'utf8',
    },
  ).trim();
const sql = async (query: string) => {
  const result = await container.exec(['psql', '-U', 'mentorhub', '-d', 'mentorhub', '-tAc', query]);
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.output.trim();
};

beforeAll(async () => {
  // Own container: this file migrates up and down without touching the app suite's database.
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('mentorhub')
    .withUsername('mentorhub')
    .withPassword('mentorhub')
    .start();
});

afterAll(async () => {
  await container.stop();
});

describe('migrations on a real PostgreSQL', () => {
  it('apply from scratch and leave nothing pending', () => {
    expect(migrate('up')).toContain(
      'Applied: Migration20261017192741_init_user, Migration20261017233958_rename_user_to_users',
    );
    expect(migrate('status')).toContain('Pending:  —');
  });

  it('keep rows through down → up of the users rename', async () => {
    await sql(
      "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'keep@example.com', 'Keep Me', 'mentee', now(), now())",
    );
    expect(migrate('down')).toContain('Reverted: Migration20261017233958_rename_user_to_users');
    expect(await sql('select email from "user"')).toBe('keep@example.com');
    expect(migrate('up')).toContain('Applied: Migration20261017233958_rename_user_to_users');
    expect(await sql('select email from users')).toBe('keep@example.com');
  });

  it('match the entities: generating a migration finds no changes', () => {
    expect(migrate('create', 'should-be-empty')).toContain('No schema changes');
  });

  it('enforce the role check and unique email', async () => {
    await expect(
      sql(
        "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'x@example.com', 'X', 'root', now(), now())",
      ),
    ).rejects.toThrow(/users_role_check/);
    await expect(
      sql(
        "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'keep@example.com', 'Dup', 'mentee', now(), now())",
      ),
    ).rejects.toThrow(/users_email_unique/);
  });
});
