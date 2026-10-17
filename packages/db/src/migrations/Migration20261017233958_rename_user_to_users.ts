import { Migration } from '@mikro-orm/migrations';

/**
 * Rename table "user" → "users" (snake_case plural, engineering standards).
 * Hand-written: the generator produced create "users" + drop "user" cascade, which loses data.
 */
export class Migration20261017233958_rename_user_to_users extends Migration {
  override name = 'Migration20261017233958_rename_user_to_users';

  override up(): void | Promise<void> {
    this.addSql(`alter table "user" rename to "users";`);
    this.addSql(`alter table "users" rename constraint "user_pkey" to "users_pkey";`);
    this.addSql(`alter table "users" rename constraint "user_email_unique" to "users_email_unique";`);
    this.addSql(`alter table "users" rename constraint "user_role_check" to "users_role_check";`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "users" rename constraint "users_role_check" to "user_role_check";`);
    this.addSql(`alter table "users" rename constraint "users_email_unique" to "user_email_unique";`);
    this.addSql(`alter table "users" rename constraint "users_pkey" to "user_pkey";`);
    this.addSql(`alter table "users" rename to "user";`);
  }
}
