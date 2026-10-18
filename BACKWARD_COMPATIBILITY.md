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
