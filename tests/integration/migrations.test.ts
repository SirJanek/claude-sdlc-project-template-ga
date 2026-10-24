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
      'Applied: Migration20261017192741_init_user, Migration20261017233958_rename_user_to_users, Migration20261018191125_auth_tokens',
    );
    expect(migrate('status')).toContain('Pending:  —');
  });

  it('keep rows through down → up of the auth-tokens migration (users with a name; auth_tokens is dropped)', async () => {
    await sql(
      "insert into users (id, email, name, role, created_at, updated_at, email_verified_at, session_version) values (gen_random_uuid(), 'keep@example.com', 'Keep Me', 'mentee', now(), now(), now(), 3)",
    );
    await sql(
      "insert into auth_tokens (id, created_at, updated_at, email, token_hash, ip_hash, expires_at) values (gen_random_uuid(), now(), now(), 'keep@example.com', repeat('a', 64), repeat('b', 64), now())",
    );
    expect(migrate('down')).toContain('Reverted: Migration20261018191125_auth_tokens');
    expect(await sql('select email from users')).toBe('keep@example.com');
    expect(await sql("select count(*) from information_schema.tables where table_name = 'auth_tokens'")).toBe('0');
    expect(migrate('up')).toContain('Applied: Migration20261018191125_auth_tokens');
    // Verification and session version are reset by the rollback (documented in the spec › Risks).
    expect(await sql('select email, email_verified_at, session_version from users')).toBe('keep@example.com||0');
  });

  it('refuse to roll back while an account has no name (the column becomes NOT NULL again)', async () => {
    await sql(
      "insert into users (id, email, name, role, created_at, updated_at) values (gen_random_uuid(), 'noname@example.com', null, 'mentee', now(), now())",
    );
    expect(() => migrate('down')).toThrow(/contains null values/);
    await sql("delete from users where email = 'noname@example.com'");
  });

  it('keep rows through down → up of the users rename', async () => {
    expect(migrate('down')).toContain('Reverted: Migration20261018191125_auth_tokens');
    expect(migrate('down')).toContain('Reverted: Migration20261017233958_rename_user_to_users');
    expect(await sql('select email from "user"')).toBe('keep@example.com');
    expect(migrate('up')).toContain(
      'Applied: Migration20261017233958_rename_user_to_users, Migration20261018191125_auth_tokens',
    );
    expect(await sql('select email from users')).toBe('keep@example.com');
  });

  it('match the entities: generating a migration finds no changes', () => {
    expect(migrate('create', 'should-be-empty')).toContain('No schema changes');
  });

  it('enforce the token hash uniqueness and the intent-role check on auth_tokens', async () => {
    const insert = (hash: string, intent: string) =>
      `insert into auth_tokens (id, created_at, updated_at, email, token_hash, intent_role, ip_hash, expires_at) values (gen_random_uuid(), now(), now(), 'x@example.com', repeat('${hash}', 64), ${intent}, repeat('i', 64), now())`;
    await sql(insert('c', "'mentor'"));
    await expect(sql(insert('c', 'null'))).rejects.toThrow(/auth_tokens_token_hash_unique/);
    await expect(sql(insert('d', "'admin'"))).rejects.toThrow(/auth_tokens_intent_role_check/);
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
