import { Migration } from '@mikro-orm/migrations';

export class Migration20261017192741_init_user extends Migration {

  override name = 'Migration20261017192741_init_user';

  override up(): void | Promise<void> {
    this.addSql(`create table "user" ("id" uuid not null, "email" varchar(320) not null, "name" varchar(120) not null, "role" text not null default 'mentee', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`alter table "user" add constraint "user_role_check" check ("role" in ('mentee', 'mentor', 'admin'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "user" cascade;`);
  }

}
