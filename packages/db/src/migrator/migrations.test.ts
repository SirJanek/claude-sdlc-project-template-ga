import { describe, expect, it } from 'vitest';
import { Migration20261017192741_init_user as InitUser } from '../migrations/Migration20261017192741_init_user';
import { Migration20261017233958_rename_user_to_users as RenameUsers } from '../migrations/Migration20261017233958_rename_user_to_users';
import { Migration20261018191125_auth_tokens as AuthTokens } from '../migrations/Migration20261018191125_auth_tokens';

const sqlOf = (migration: { getQueries(): unknown[] }) => migration.getQueries().map(String).join('\n');
type Args = ConstructorParameters<typeof InitUser>;
const make = <T>(Cls: new (...args: Args) => T) => new Cls({} as Args[0], {} as Args[1]);

describe('migration 1 — init user', () => {
  it('creates the user table with a unique email and a role check, and drops it on down', () => {
    const up = make(InitUser);
    up.up();
    expect(sqlOf(up)).toMatch(/create table "user"/);
    expect(sqlOf(up)).toMatch(/user_email_unique/);
    expect(sqlOf(up)).toMatch(/check \("role" in \('mentee', 'mentor', 'admin'\)\)/);
    const down = make(InitUser);
    down.down();
    expect(sqlOf(down)).toMatch(/drop table if exists "user"/);
  });
});

describe('migration 2 — rename user to users', () => {
  it('renames table and constraints instead of drop + create (keeps data)', () => {
    const up = make(RenameUsers);
    up.up();
    expect(sqlOf(up)).toContain('alter table "user" rename to "users"');
    expect(sqlOf(up)).not.toMatch(/drop table|create table/);
    const down = make(RenameUsers);
    down.down();
    expect(sqlOf(down)).toContain('alter table "users" rename to "user"');
    expect(sqlOf(down)).not.toMatch(/drop table|create table/);
  });
});

describe('migration 3 — auth tokens and user session columns', () => {
  it('adds nullable/defaulted columns to users and creates auth_tokens with a hashed, unique token', () => {
    const up = make(AuthTokens);
    up.up();
    const sql = sqlOf(up);
    expect(sql).toMatch(/create table "auth_tokens"/);
    expect(sql).toContain('"token_hash" char(64) not null');
    expect(sql).toContain('"ip_hash" char(64) not null');
    expect(sql).toMatch(/auth_tokens_token_hash_unique/);
    expect(sql).toMatch(/check \("intent_role" in \('mentee', 'mentor'\)\)/);
    expect(sql).toContain('add "email_verified_at" timestamptz null');
    expect(sql).toContain('add "github_id" varchar(32) null');
    expect(sql).toContain('add "session_version" int not null default 0');
    expect(sql).toContain('alter column "name" drop not null');
    expect(sql).toMatch(/users_github_id_unique/);
    // Additive: the users table is never dropped or recreated.
    expect(sql).not.toMatch(/drop table|create table "users"/);
  });

  it('reverts everything it added (and nothing else) on down', () => {
    const down = make(AuthTokens);
    down.down();
    const sql = sqlOf(down);
    expect(sql).toMatch(/drop table if exists "auth_tokens"/);
    expect(sql).toContain('drop column "email_verified_at", drop column "github_id", drop column "session_version"');
    expect(sql).toContain('alter column "name" set not null');
    expect(sql).not.toMatch(/drop table if exists "users"/);
  });
});
