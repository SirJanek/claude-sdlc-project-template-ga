# Spec: Stack bootstrap — pnpm monorepo with Next.js, MikroORM, Awilix, Tailwind and shadcn/ui

**Intent:** [intent.md](../../docs/sdlc/intent.md) › Constraints (course timeline, AI-native SDLC) — enabling work, no user-facing feature
**Status:** accepted · requested and accepted by Jan (product owner) on 2026-10-17 · course L02

## Scope

**In:**

- pnpm workspace monorepo with four packages under `packages/`:
  `@mentorhub/app` (Next.js application), `@mentorhub/core` (reusable domain logic),
  `@mentorhub/db` (MikroORM config, entities, migrations, helpers), `@mentorhub/ui`
  (reusable shadcn/ui components).
- Latest stable Next.js (App Router) + React + TypeScript (strict).
- PostgreSQL via MikroORM with migrations and connection pooling; first entity `User` and the
  first migration; local database through `docker compose`.
- Awilix dependency-injection container with a request scope.
- Tailwind CSS for public (frontend) pages; shadcn/ui components for admin (backend) pages.
- A thin vertical slice that proves the wiring: public landing page `/`, admin page `/admin`
  listing users, health endpoint `/api/health`.
- `Makefile` targets wired to real commands; root `AGENTS.md`, nested `AGENTS.md` per package,
  README architecture notes.

**Out:**

- Product features from discovery (catalogue, booking, payments, video, messaging).
- Authentication and authorization — `/admin` is **unprotected** in this slice (see Concerns).
- CI workflow changes (safety net is the next step), deployment, production configuration.
- Seeding real data; the business-rule engine beyond the parameters already proposed in discovery.

## Acceptance criteria

1. Given a clean clone, when `make install` runs, then pnpm installs all workspaces from the
   lockfile and exits 0.
2. Given installed dependencies, when `make check` runs, then lint (ESLint + Prettier check),
   typecheck (`tsc --noEmit` in every package), unit tests (Vitest) and the production build of
   `@mentorhub/app` all pass and the command exits 0; if any of them fails it exits non-zero.
3. Given `make db-up`, when `make db-migrate` runs, then the migration creates table `user`
   (columns `id` uuid PK, `email` unique, `name`, `role` enum `mentee|mentor|admin`,
   `created_at`, `updated_at`) and a second run reports nothing to apply.
4. Given the database is up and migrated, when `GET /api/health` is called, then it returns 200
   with `{"status":"ok","db":"up"}`; given the database is down, it returns 503 with
   `{"status":"degraded","db":"down"}`.
5. Given the running app, when `/` is opened, then a public landing page styled with Tailwind
   renders (UI text in English).
6. Given the running app with the database up, when `/admin` is opened, then an admin page built
   from `@mentorhub/ui` (shadcn/ui) components lists users from the database, with an empty state
   when there are none and an error state when the database is down.
7. Given the app code, when a service needs the database, then it receives a request-scoped
   `EntityManager` from the Awilix container — no module imports the ORM singleton directly
   outside the composition root (`packages/app/src/server/container.ts`).
8. Given the business parameters proposed in discovery, when `@mentorhub/core` is imported, then
   they are exposed from one configuration object with pure functions (intro price, free
   cancellation window) covered by unit tests — no literals elsewhere.
9. Given the repo, when an agent opens any package, then a nested `AGENTS.md` states that
   package's purpose, allowed dependencies and commands, and the root `AGENTS.md` and `README.md`
   describe the architecture and real commands.

## Interfaces touched

| Interface | Change | Breaking |
|---|---|---|
| `GET /api/health` | added | no |
| `GET /` (public landing), `GET /admin` (admin users list) | added | no |
| DB table `user` | added (migration 1) | no |
| `make install/test/lint/typecheck/check/dev`, new `make db-up/db-down/db-migrate/db-migration` | wired / added | no |

## Data and migrations

- Migration 1 creates `user`. Reversible: `down` drops the table. Rehearsed locally: up → down → up.
- Connection settings from environment (`DATABASE_URL`), defaults for local docker in `.env.example`.
- Pool: MikroORM/pg pool, `min 0`, `max 10` locally (configurable).

## Non-functional requirements

| Property | Target |
|---|---|
| `make check` on a laptop (warm cache) | under 3 minutes |
| `/api/health` (p95, local) | under 200 ms with DB up |
| Node | ≥ 22 (tested on 26) |
| Retention | n/a |

## Risks

- MikroORM inside Next.js (bundling, decorators, connection reuse in dev hot reload) — mitigated
  with `defineEntity` (no decorators), `serverExternalPackages`, and an ORM singleton kept on
  `globalThis` in development.
- Workspace packages shipped as TypeScript source need `transpilePackages` in Next; a mistake shows
  up only at build time — covered by the build in `make check`.
- Tailwind 4 must scan `packages/ui` sources, otherwise admin components render unstyled —
  checked visually in the running app.

## Concerns raised

> **CONCERN (security):** `/admin` and the users list are reachable without authentication in this
> slice and show emails. Acceptable only on a local machine; must not be deployed until auth and
> role checks exist. Needs a decision on the auth approach in the next spec.

## Open questions

- [ ] Authentication approach (Auth.js, own sessions, managed provider) — product owner, next spec
- [ ] Hosting target for the app and database — product owner

## Implementation plan

**Accepted:** 2026-10-17 by Jan (requested in one prompt; reviewed in the PR)

### Files touched

| File | Change | Why |
|---|---|---|
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc`, `.nvmrc` | add | workspace root, shared TS settings, pinned pnpm |
| `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` | add | lint + format check for AC 2 |
| `docker-compose.yml`, `.env.example` | add | local PostgreSQL (port 5433) for AC 3–4, 6 |
| `Makefile` | modify | real targets, DB targets (AC 1–3) |
| `packages/core/**` | add | business-rule config + pure functions + tests (AC 8) |
| `packages/db/**` | add | ORM config, `User` entity, migration 1, `createOrm`, migrate scripts, tests (AC 3, 7) |
| `packages/ui/**` | add | shadcn/ui components (button, card, badge, table), `cn`, `components.json` (AC 6) |
| `packages/app/**` | add | Next.js app, Tailwind, Awilix container, services, `/`, `/admin`, `/api/health`, tests (AC 4–7) |
| `AGENTS.md`, `packages/*/AGENTS.md`, `README.md`, `CLAUDE.md` | modify / add | architecture and commands (AC 9) |
| `.gitignore` | modify | `.next/`, `.env`, coverage |

### Tests

| Criterion | Test | New or changed |
|---|---|---|
| 1 | `make install` on the branch (evidence in PR) | new |
| 2 | `make check` output pasted in PR; mutation: break a rule → `make check` fails | new |
| 3 | `make db-migrate` twice + `migration:down` rehearsal (evidence in run log) | new |
| 4 | `packages/app/src/server/services/health.test.ts` (up/down with fakes) + live curl | new |
| 5, 6 | headless Chrome render of `/` and `/admin` (empty, with a user, DB down) | new |
| 7 | `packages/app/src/server/container.test.ts` (scoped EM per request) + grep: no ORM import outside container | new |
| 8 | `packages/core/src/rules.test.ts` | new |
| 9 | files present; agent answers from nested AGENTS.md | new |

### Commit sequence

1. `docs: spec for stack-bootstrap` — this file and the run log
2. `chore: pnpm workspace, TypeScript, lint and format tooling`
3. `feat(core): business rule parameters and policies`
4. `feat(db): MikroORM config, User entity and first migration`
5. `feat(ui): shadcn/ui base components`
6. `feat(app): Next.js app with Awilix container, public, admin and health routes`
7. `chore: wire Makefile and docker compose`
8. `docs: architecture in README and AGENTS.md files`

### Riskiest assumption

**Assumption:** MikroORM 7 runs inside the Next.js 16 server runtime (Turbopack build) without
decorator metadata and keeps one pool across dev hot reloads.

**If it is wrong:** `/admin` and `/api/health` fail at build or runtime; the DB layer would need
to move behind a separate API process.

**Cheapest way to find out first:** build the app with only `/api/health` calling the ORM before
writing the admin page.

### Cannot implement as written

Nothing known yet; recorded here if the probe fails.

### Out of scope for this plan

Auth, CI safety net (next step), deployment.
