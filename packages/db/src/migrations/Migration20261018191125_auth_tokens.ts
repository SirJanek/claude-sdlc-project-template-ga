import { Migration } from '@mikro-orm/migrations';

/**
 * Accounts and roles, Phase 1: users gain nullable name, email_verified_at, github_id (unique) and
 * session_version; new auth_tokens table (hashed one-time e-mail links). Generated SQL, reviewed:
 * additive only, no drop/recreate. `down` loses verification and GitHub links and fails while a
 * user has a null name (spec › Risks: roll back only before real users exist).
 */
export class Migration20261018191125_auth_tokens extends Migration {

  override name = 'Migration20261018191125_auth_tokens';

  override up(): void | Promise<void> {
    this.addSql(`create table "auth_tokens" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(320) not null, "token_hash" char(64) not null, "intent_role" text null, "next_path" varchar(512) null, "ip_hash" char(64) not null, "expires_at" timestamptz not null, "used_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "auth_tokens_email_index" on "auth_tokens" ("email");`);
    this.addSql(`alter table "auth_tokens" add constraint "auth_tokens_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "auth_tokens_ip_hash_index" on "auth_tokens" ("ip_hash");`);

    this.addSql(`alter table "users" add "email_verified_at" timestamptz null, add "github_id" varchar(32) null, add "session_version" int not null default 0;`);
    this.addSql(`alter table "users" alter column "name" drop not null;`);
    this.addSql(`alter table "users" add constraint "users_github_id_unique" unique ("github_id");`);

    this.addSql(`alter table "auth_tokens" add constraint "auth_tokens_intent_role_check" check ("intent_role" in ('mentee', 'mentor'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "auth_tokens" cascade;`);

    this.addSql(`alter table "users" drop constraint "users_github_id_unique";`);
    this.addSql(`alter table "users" drop column "email_verified_at", drop column "github_id", drop column "session_version";`);
    this.addSql(`alter table "users" alter column "name" set not null;`);
  }

}
