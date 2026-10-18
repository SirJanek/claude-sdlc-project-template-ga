# Backward compatibility — MentorHub

What this repository treats as a **protected contract surface**, and the path a change to one must
take. Review skills check diffs against this file; implementation skills warn before breaking it.
Inventory taken from the code on 2026-10-18 — update this file in the same PR that adds a surface.

MentorHub is pre-release: there are no external API consumers and no production data yet. The
rules below are therefore mostly "change every consumer in the same PR and say so", and become
stricter (deprecation windows) when the first external consumer or production database exists.

## 1. HTTP API (`packages/app/src/app/api/**`)

| Surface | Contract |
|---|---|
| Response envelope | `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }` from `apiHandler`; validation errors → 422 `validation_failed` with `fieldErrors` |
| CSRF header | state-changing methods require `x-mentorhub-request: 1` (`REQUEST_HEADER`) |
| Error codes and statuses | `AppError` subclasses map to fixed status + `code` (401, 403, 404, 405, 409, 422) |
| `GET /api/health` | **non-envelope** monitor contract: `200 { status: "ok", db: "up" }` / `503 { status: "degraded", db: "down" }` |
| `/api/users` | `makeCrudRoute` — `GET` list behind `requireSession`; unsupported methods → 405 |

**Breaking:** removing or renaming a route, field or error `code`; changing a status code;
making an optional request field required; loosening or dropping the CSRF or session check
(that is a security change, not just a compatibility one); changing `/api/health` shape or
status codes (monitors depend on them).
**Required path:** update `ui/src/backend` callers and integration tests in the same PR; note
the change in the PR body under 💥. Once an external consumer exists: add the new shape next to
the old one and keep both for one release.

## 2. Database schema and migrations (`packages/db/src/migrations/`)

**Breaking:** editing or deleting an applied migration; dropping or renaming a table/column
without a data-preserving migration; tightening a constraint (`NOT NULL`, unique) on existing
data without a backfill.
**Required path:** new migration only, created with `make db-migration NAME=…` and
hand-reviewed (renames are hand-written, never drop + create — see migration
`Migration20261017233958_rename_user_to_users`); a migration test in
`tests/integration/migrations.test.ts` covering up and data survival; `risk-high` label and a
rollback note in the PR body.

## 3. Workspace package APIs

`@mentorhub/core` (`src/index.ts`), `@mentorhub/db` (`src/index.ts`), `@mentorhub/ui` (exports
map: `.`, `./styles.css`, `./components/*`, `./lib/*`, `./backend/*`). These are internal to the
monorepo and not published.

**Breaking:** removing or renaming an export, or changing a signature, used by another package.
**Required path:** update every consumer in the same PR (typecheck proves it); no deprecation
window while the packages are unpublished. The dependency direction (`app → core → db`, `ui` →
`app` only) is part of the contract and is not changed without a spec.

## 4. Business rules (`packages/core/src/config/rules.ts`)

`RULES` and the functions built on it (`sessionPrice`, `introPrice`, `isFreeCancellation`,
`isBookable`, `platformFeePercent`) are proposals from discovery until a spec adopts them.
**Breaking:** changing a value or a formula once a spec has adopted it (prices, fees, notice and
cancellation windows, payout minimum).
**Required path:** the spec is updated first, with the reason; the PR quotes the spec change and
carries unit tests for the boundary values.

## 5. Configuration and environment (`packages/core/src/config/env.ts`, `.env.example`)

`NODE_ENV`, `DATABASE_URL`, `DB_POOL_MAX`, `LOG_LEVEL`, `ALLOW_DEV_ADMIN` and their defaults.
**Breaking:** renaming or removing a variable, adding a required variable without a default,
changing a default that alters behaviour. `ALLOW_DEV_ADMIN` must stay honoured only in
`NODE_ENV=development` — widening it is a security defect, not a compatibility change.
**Required path:** update `.env.example`, `docker-compose.yml`, the CI workflow and the README in
the same PR.

## 6. Developer and pipeline commands

The `Makefile` targets (`setup`, `install`, `setup-browser`, `test`, `test-integration`, `lint`,
`typecheck`, `build`, `audit`, `check`, `dev`, `db-*`), root `package.json` scripts (incl. `setup`
→ `tools/setup`, flag `--skip-browser`), the CI job names
(five required checks in branch protection, plus the on-demand **Integration** workflow and its
`run-integration` label), `.ai/agentic.config.json` and the integration
evidence layout (`tests/integration/.evidence/`, uploaded by CI).
**Breaking:** renaming or removing a target, script or CI job name; changing what `make check`
runs; moving the evidence directory.
**Required path:** update the config's `validation.commands`, `SDLC.md`, `AGENTS.md`, README
and — for a CI job name — branch protection in the same change (a renamed required check blocks
every PR until protection is updated). Workflow files are a protected path (AGENTS.md hard rule):
ask first.

## 7. Session, roles and CSRF (`packages/core/src/http/auth.ts`, `packages/core/src/http/apiHandler.ts`, `packages/ui/src/backend/api/types.ts`)

The `Session` shape (`userId`, `role`, `isDevSession`), the roles `mentee` / `mentor` / `admin`
(`USER_ROLES` in `packages/db/src/entities/auth/user.entity.ts`, enforced by the `users_role_check`
constraint) and the CSRF header `x-mentorhub-request: 1`. The header name exists **twice on
purpose** (`ui` must not import `core`): `REQUEST_HEADER` in `packages/core/src/http/apiHandler.ts`
(checked on state-changing methods) and in `packages/ui/src/backend/api/types.ts` (sent by
`apiCall`); `tests/integration/app.test.ts` hard-codes it too. Real authentication is not implemented yet: the only session is the
local dev admin (`ALLOW_DEV_ADMIN=1` **and** `NODE_ENV=development`), every other caller is denied.
**Breaking:** renaming or removing a role, the header or a `Session` field; loosening the
dev-admin allowlist (that is a security defect, not a compatibility change); once auth ships,
renaming the session cookie.
**Required path:** change the server constant, the client constant and the integration test in the
same PR (unit tests stay green if one copy is missed — only the integration run catches it); a role
rename also needs a migration for `users_role_check` (§2). Add an integration test for the denied
path; `risk-high` label and a second reviewer.

## Product decisions

None recorded yet. When `om-discover` writes `.ai/specs/product-brief.md`, its Non-goals,
Business rules and Decisions tables become a protected contract here too: a change that
contradicts an active entry needs a superseding entry approved by its owner in the same PR.
(Our `SDLC.md` gains the matching section only when the product layer is set up with
`om-setup-discovery-pipeline`.)

## How to make a breaking change

1. Name the surface and the section above in the PR body under **💥 Compatibility** (the heading the
   PR body template uses): who is
   affected and how they migrate.
2. Update this file in the same PR when the surface itself changes shape.
3. Update every in-repo consumer in the same PR — `make check` and, for routes, pages and
   migrations, a green **Integration** run (`run-integration` label) are the proof.
4. Prefer expand-then-contract over a single cut for schema and export renames (add the new shape,
   migrate consumers, remove the old one in a later PR).
5. Label the PR `risk-high` where `SDLC.md` says so (schema migrations, shared contracts, auth,
   money) and get a second reviewer.

## What is not protected

Internal, unexported helpers; Tailwind classes and page markup beyond anything
`tests/integration/app.test.ts` asserts on (today: the landing `h1`, the `/admin` → `/admin/users`
redirect, the users table rows, their order and the email column, the empty state and the error
alert); the output wording of `make setup` other than its exit codes; and anything under `docs/discovery/mockups/` (prototypes, not product). These
still change through tests and migrations, just without the breaking-change paperwork.
