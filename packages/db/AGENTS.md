# packages/db — data layer (`@mentorhub/db`)

Read the root `AGENTS.md` and `.ai/docs/engineering-standards.md` first; this file adds rules
for this package only.

- **The only package that imports `@mikro-orm/*`.** Imports nothing internal (no core/app/ui).
- **Entities:** `src/entities/<concept>/<name>.entity.ts`, `defineEntity` + `setClass` (no
  decorators), spreading `baseProperties` from `base.entity.ts` (UUID id, `createdAt`,
  `updatedAt`). PascalCase singular class, **snake_case plural table** (`users`), snake_case
  columns. Register each entity in `src/entities/index.ts` (explicit list, no scanning).
- **Migrations:** change entities, `make db-migration NAME=<slug>`, then **read the SQL** —
  renames come out as `create` + `drop … cascade` and must be rewritten by hand
  (`alter table … rename`). Every migration has a working `down`; rehearse up → down → up with
  rows present; afterwards `make db-migration` must report no changes. Never edit an applied one.
- **Config:** `createOrmConfig(env)` reads `DATABASE_URL`/`DB_POOL_MAX`; the web runtime never loads
  the migrator (only `src/scripts/migrate.ts` adds it). MikroORM 7 connects lazily — check the DB
  with a query, not `checkConnection()`.
- `getOrm()` is the process singleton for core's composition root only.
- **Tests:** unit tests run without a database (metadata, migration SQL via `getQueries()`, CLI logic
  in `src/migrator/` with a fake migrator) and keep 100% coverage; they live outside
  `src/migrations/` (the migrator loads every file there). Every new migration gets a case in
  `tests/integration/migrations.test.ts` (fresh container: up, down with rows, up, no drift).
- All access through entity/query APIs — no raw SQL with interpolated input.
- Commands: `pnpm --filter @mentorhub/db test | typecheck | migrate | migrate:down | migrate:status | migration:create <name>`.
