# packages/db — data layer (`@mentorhub/db`)

Read the root `AGENTS.md` first; this file adds rules for this package only.

- **Entities:** `src/entities/*.ts` with `defineEntity` + `setClass` (no decorators — they break
  in the Next.js build). Register each new entity in `entities` in `src/config.ts`.
- **Migrations:** change entities, then `make db-migration NAME=<slug>` (generates a file in
  `src/migrations/` and updates the snapshot), review the SQL, then `make db-migrate`. Every
  migration must have a working `down`; rehearse up → down → up locally. Never edit a
  migration that has been applied anywhere.
- **Config:** `createOrmConfig(env)` reads `DATABASE_URL` and `DB_POOL_MAX`; the web runtime
  never loads the migrator (only `src/scripts/migrate.ts` adds it).
- **Connections:** MikroORM 7 connects lazily — to check the DB, run a query; do not trust
  `checkConnection()` before the first query.
- `getOrm()` is the process singleton for the app's composition root only.
- Tests run without a database (metadata checks); DB-dependent checks need `make db-up`.
- Commands: `pnpm --filter @mentorhub/db test | typecheck | migrate | migrate:down | migrate:status | migration:create <name>`.
