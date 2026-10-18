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
| Error codes and statuses | `AppError` subclasses map to fixed status + `code` (401, 403, 404, 405, 409, 410 `link_invalid`, 422, 429 `rate_limited`, 503 `mail_not_sent`) |
| `GET /api/health` | **non-envelope** monitor contract: `200 { status: "ok", db: "up" }` / `503 { status: "degraded", db: "down" }` |
| `/api/users` | `makeCrudRoute` — `GET` list and `POST` create, both **admin only** (`requireSession` + `requireRole('admin')`); `POST` body `{ email, name, role? }` → `200` with the created user (`email` lower-cased), `422` invalid, `409` duplicate email; unsupported methods → 405 |
| `GET /api/admin/health` | admin only, envelope: `{ ok: true, data: { status, db: "up" \| "down" } }` — a down database is a `200` report, not an error |
| `POST /api/auth/email/start` | public; body `{ email, intentRole?: 'mentor', next? }` (`next` a same-origin relative path) → **always** `200 { sent: true }` for a valid body, also for unknown or existing e-mails (no enumeration); `422` invalid (incl. `intentRole: 'admin'`); `429 rate_limited`; `503 mail_not_sent` |
| `POST /api/auth/email/consume` | public; body `{ token }` → `200 { next }` + `Set-Cookie: mh_session=…`; `410 link_invalid` for an unknown, used or expired token; a token is consumed **only** here, never by `GET /auth/confirm`. `next` = the link's validated `next`, else the role's default (`/mentor/profile` for a mentor, `/` otherwise); a sign-up link (`intentRole`) used for an e-mail that already has an account signs in to **that** account, never changes its role, creates nothing, and appends `?notice=existing_account` (E01 Phase 3, #26) |
| `POST /api/auth/sign-out` | body `{ everywhere?: boolean }` → `200 { signedOut: true }` + cookie cleared (`Max-Age=0`); `everywhere: true` needs a session (`401` otherwise) and bumps `sessionVersion` |
| `GET /api/auth/me` | `200 { id, email, name, role, emailVerified }` for the session (the dev admin answers a fixed record with `id: 'dev-admin'`); `401` without one |
| Pages `/sign-in`, `/check-email`, `/auth/confirm?token=` | `(auth)` route group; `/sign-in?next=` carries the return path, `?error=` renders an alert; `/auth/confirm` GET renders "Sign in as <e-mail>?" and consumes nothing |
| Pages `/sign-up/mentor`, `/mentor/profile` | `/sign-up/mentor` (`(auth)`) sends `intentRole: 'mentor'` and moves to `/check-email?role=mentor` (a resend keeps the intent); `/mentor/profile` (`(mentor)`) requires a mentor session — signed out → `307` to `/sign-in?next=%2Fmentor%2Fprofile`, another role → a refusal page ("Mentor account required"); shows `ExistingAccountNotice` for `?notice=existing_account`; **no payout, bank or card field or step** (R07) — adding one is a product decision, not a compatibility change |

**Breaking:** removing or renaming a route, field or error `code`; changing a status code;
making an optional request field required; loosening or dropping the CSRF or session check
(that is a security change, not just a compatibility one); changing `/api/health` shape or
status codes (monitors depend on them); making `email/start` reveal whether an e-mail is
registered; letting a GET consume a token.
**Required path:** update `ui/src/backend` callers and integration tests in the same PR; note
the change in the PR body under 💥. Once an external consumer exists: add the new shape next to
the old one and keep both for one release.

## 2. Database schema and migrations (`packages/db/src/migrations/`)

**Breaking:** editing or deleting an applied migration; dropping or renaming a table/column
without a data-preserving migration; tightening a constraint (`NOT NULL`, unique) on existing
data without a backfill.
**Required path:** new migration only, created with `make db-migration NAME=…` and
hand-reviewed (renames are hand-written, never drop + create — see migration
`Migration20261017233958_rename_user_to_users`; `Migration20261018191125_auth_tokens` is the
additive reference: nullable columns, a default, a new table, reversible `down`); a migration test in
`tests/integration/migrations.test.ts` covering up and data survival; `risk-high` label and a
rollback note in the PR body.

## 3. Workspace package APIs

`@mentorhub/core` (`src/index.ts` — incl. `EventBus`, `EventMap`, `userCreateSchema`, the auth schemas, `AuthService`, `MailSender`, the `http/session.ts` helpers, `AUTH_LIMITS`; event IDs `concept.entity.action` and their payloads, today `auth.user.created { userId, email, method: 'email' | 'github' | 'admin' }`, are part of the contract — `method` was added in E01 Phase 1, every emitter sets it), `@mentorhub/db` (`src/index.ts` — incl. `isUniqueViolation`, `AuthToken`), `@mentorhub/ui` (exports
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

`NODE_ENV`, `DATABASE_URL`, `DB_POOL_MAX`, `LOG_LEVEL`, `ALLOW_DEV_ADMIN`, `AUTH_SECRET` (≥ 32
characters, **required** except under `NODE_ENV=test`, which uses a fixed test-only value — there is
deliberately no development default; `make setup` writes one to `packages/app/.env.local`), `APP_URL`
(default `http://localhost:3000`), `MAIL_ADAPTER` (`mock`; refused in production unless
`ALLOW_TEST_ADAPTERS=1`), `MAIL_OUTBOX_FILE` (optional), `ALLOW_TEST_ADAPTERS` and their defaults.
**Breaking:** renaming or removing a variable, adding a required variable without a default,
changing a default that alters behaviour. `ALLOW_DEV_ADMIN` must stay honoured only in
`NODE_ENV=development` — widening it, adding a development default for `AUTH_SECRET`, or letting a
test adapter run in production without `ALLOW_TEST_ADAPTERS=1` is a security defect, not a
compatibility change.
**Required path:** update `.env.example`, `docker-compose.yml`, the CI workflow and the README in
the same PR.

## 6. Developer and pipeline commands

The `Makefile` targets (`setup`, `install`, `setup-browser`, `test`, `test-integration`, `lint`,
`typecheck`, `build`, `audit`, `check`, `dev`, `db-*`, `set-role EMAIL= ROLE=`), root `package.json`
scripts (incl. `setup` → `tools/setup`, flag `--skip-browser`, `db:set-role`), the CI job names
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

The `Session` shape (`userId`, `role`, `isDevSession`, `emailVerified` — added in E01 Phase 1,
additive; `DEV_ADMIN_SESSION` has `true`), the roles `mentee` / `mentor` / `admin`
(`USER_ROLES` in `packages/db/src/entities/auth/user.entity.ts`, enforced by the `users_role_check`
constraint) and the CSRF header `x-mentorhub-request: 1`. The header name exists **twice on
purpose** (`ui` must not import `core`): `REQUEST_HEADER` in `packages/core/src/http/apiHandler.ts`
(checked on state-changing methods) and in `packages/ui/src/backend/api/types.ts` (sent by
`apiCall`); `tests/integration/app.test.ts` hard-codes it too. **Session cookie `mh_session`**
(`SESSION_COOKIE` in `packages/core/src/http/session.ts`): httpOnly, `SameSite=Lax`, `Path=/`,
`Secure` in production, `Max-Age` 7 days fixed (no refresh, no sliding window — grill-me Q6/Q13);
value = HS256 JWT with claims `sub` (user id) and `sv` (`users.session_version`); `requireSession`
is **async** and must be awaited by every caller; a valid cookie wins over the dev admin, which is
still admitted only with `ALLOW_DEV_ADMIN=1` **and** `NODE_ENV=development`. `sessionVersion` is
bumped by "sign out everywhere" and `make set-role`.
**Breaking:** renaming or removing a role, the header, the cookie or a `Session` field; loosening the
dev-admin allowlist, skipping the `sv` comparison or the DB lookup, or making a session check fail
open (security defects, not compatibility changes); changing the JWT algorithm or claim names
(every existing cookie stops verifying — a forced sign-out of everyone).
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
`tests/integration/app.test.ts` asserts on (today: the landing `h1`, the `/admin` Dashboard text and the
admin navigation, the users table rows, their order and the email column, the empty state and the error
alert); the output wording of `make setup` other than its exit codes; the sign-in, check-email and confirm page markup beyond what `tests/integration/auth.test.ts` asserts on (the confirm heading "Sign in as <e-mail>?", its button, the expired-link alert, the `SessionMenu` name/e-mail and "Sign out"); and anything under `docs/discovery/mockups/` (prototypes, not product). These
still change through tests and migrations, just without the breaking-change paperwork.
