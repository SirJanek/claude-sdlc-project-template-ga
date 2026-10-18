import { describe, expect, it } from 'vitest';
import { Migration20261017192741_init_user as InitUser } from '../migrations/Migration20261017192741_init_user';
import { Migration20261017233958_rename_user_to_users as RenameUsers } from '../migrations/Migration20261017233958_rename_user_to_users';

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
