# Run: E01 Phase 1 — auth foundation and e-mail link (#44)

**Date:** 2026-10-18 · **Agent:** Claude Code (Fable 5.1, subagent) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-accounts-and-roles.md](../specs/2026-10-18-accounts-and-roles.md) › Implementation Plan › Phase 1
**Tracker:** #44 (E01-T01) · **Branch:** `feat/e01-phase1-auth-foundation` (worktree `…-wt/e01-phase1`)
**Status:** done — Phase 1 complete on the branch; PR opened by Jan

## Goal

Phase 1 only: env + `AUTH_LIMITS`, migration (`users` columns, `auth_tokens`), session primitives (`jose`),
async `requireSession` (awaited in `makeCrudRoute`), `MailSender` port + mock, `AuthService` e-mail link,
routes + pages, `set-role` CLI, docs/contracts, integration tests. No GitHub (Phase 2), no `/sign-up/mentor`
(Phase 3), no `next` plumbing beyond what Phase 1 lists (Phase 4).

## Decisions

- `AUTH_SECRET`: Zod `transform` adds the issue when missing outside `test`; the `test` default is a named
  constant (`TEST_AUTH_SECRET`). Rejected: a `.default()` keyed on `NODE_ENV` (would need a second schema).
- `make setup` writes the generated secret to `packages/app/.env.local` (git-ignored, read by Next.js), never
  overwriting an existing value — new step `auth-secret`, last in `STEPS`. Rejected: root `.env` (migrations
  do not read it and Next.js does not either).
- `docker-compose.yml` has no app service, so the new variables are documented there in a comment only.
- Dev-admin: a valid `mh_session` cookie wins over the flag so real sessions can be exercised on `make dev`;
  without a valid cookie the allowlist branch is unchanged (ALLOW_DEV_ADMIN=1 and NODE_ENV=development).
- `consumeEmailLink` claims the row with one `UPDATE … where used_at is null and expires_at > now` (atomic
  single use) inside a transaction with the find-or-create; a lost race on `users.email` → 409, token kept
  unused. Rejected: read-then-write of `usedAt` (race window between two clicks).
- `requireSession` loads the user through `cradle.sessionUserLookup`, an Awilix alias of `userService`
  (`findForSession`), in its own `withScope` — a second EM fork per authenticated request, accepted for
  simplicity. Rejected: threading the route's scope into the guard (changes every call site's shape).
- Plain sign-out clears the cookie only (the JWT stays valid until expiry, by design: "clears this
  device's cookie only"); `everywhere: true` bumps `sessionVersion`. The integration test asserts both.
- Pages: `(auth)` pages are async server components reading `searchParams`; client parts are colocated
  (`SignInForm`, `ResendButton`, `ConfirmSignIn`) so no client bundle imports `@mentorhub/core`.
- `SessionMenu` lives in `ui/src/components/auth/` (concept component, apiCall only, no `next` import);
  the admin header's "Local only — dev access, no auth" badge is replaced by it (dev admin still marked).
- `src/instrumentation.ts` (`register`) calls `getEnv()` on the Node.js runtime: a missing `AUTH_SECRET`
  or the mock mail adapter in production refuses the server at boot (spec › Edge Cases) instead of per request.
- Integration: first run failed 3 tests — `auth.test.ts` ran before `app.test.ts` (left rows) and my
  `docker start` restart of the stopped container could not work (testcontainers → new random host port).
  Fix: `SharedDatabaseSequencer` in `vitest.integration.config.ts` (files that stop the database run last,
  the rest alphabetical) and `afterAll` cleanup in `auth.test.ts`; each server has its own `APP_URL` and
  `MAIL_OUTBOX_FILE` (evidence folder).
- Mutation checks performed and recorded: (1) `await` removed from `authorize` → 2 tests red (expected 200
  to be 401); (2) `usedAt: null` removed from the consume claim → "rejects a link clicked twice" red.

## Steps

- [x] 1 env + limits (`b06fd68`)
- [x] 2 migration (`875ca9e`) — rehearsed up → down → up with rows on a temp container; `migration:create` reports no changes
- [x] 3 session primitives + 4 async requireSession, awaited `authorize` (`485a7f9`)
- [x] 5 mail port + 6 AuthService (`816d443`)
- [x] 7 routes + pages + SessionMenu + instrumentation (`8d7f618`)
- [x] 8 set-role CLI (`5d58f28`)
- [x] 9 docs/contracts + integration (`98464d3`)
- [x] 10 spec progress (this commit)

## Verification

- `make check` → exit 0: Prettier clean; unit tests tools/setup 51, db 28, ui 43, core 119, app 59 (all at
  100 % lines/branches/functions/statements); `next build` compiled; `pnpm audit --audit-level high`:
  1 high, ignored (the documented braces advisory).
- `make test-integration` → `Test Files 3 passed (3)`, `Tests 35 passed (35)` (auth 13, migrations 7, app 15).
- Mutation 1 (`makeCrudRoute`, `await authorize(request)` → `authorize(request)`): "awaits an async guard…"
  and "defaults to requireSession: an unauthenticated GET /api/users is 401" fail with
  `AssertionError: expected 200 to be 401`, plus unhandled rejections; restored, 9/9.
- Mutation 2 (`AuthService.consumeEmailLink`, claim without `usedAt: null`): "rejects a link clicked twice —
  single use" fails with `promise resolved "{ userId: 'id-2', …}" instead of rejecting`; restored, 21/21.
- Migration rehearsed on a throw-away `postgres:17-alpine` container: up, rows in `users` (one with a null
  name) and `auth_tokens`, down refused while a name is null, down after naming, up, rows kept,
  `migration:create` → "No schema changes".

## Review fixes (Codex `om-code-review` on PR #46 — REQUEST CHANGES, 5 findings)

| # | Finding | Fix | Proof |
|---|---|---|---|
| H1 | `/\t/evil.example` passes `nextPathSchema`; parsers strip control chars → `https://evil.example/` | `isSameOriginPath`: printable characters only + parsed origin checked against a fixed base; `ConfirmSignIn.safeDestination` guards `window.location.assign` on the client too | schema regressions (tab, CR, LF, NUL, DEL, space), client test for `/\t/`, `//`, `https:`, `/\`; integration: 6 such `next` values → 422, no token row |
| H2 | per-IP limit not atomic across e-mails | one `select pg_advisory_xact_lock(hashtext(?)), pg_advisory_xact_lock(hashtext(?))` with `email:<e-mail>` then `ip:<hash>` (fixed order, bound) | unit: 19 warm + 4 concurrent distinct e-mails → exactly 1 passes; integration: 26 concurrent distinct e-mails from one forwarded IP on real PostgreSQL → 20 × 200, 6 × 429, 20 rows, 20 mails |
| H3 | `sessionVersion += 1` read-then-write (service and `set-role`) | `revokeSessions` in db: `update users set session_version = session_version + 1 … returning`; `set-role`: role + version in one UPDATE | unit: two concurrent revocations with a sign-in between → version 2, in-between cookie stale (fake rows are detached copies, so a read-then-write would lose the update); integration: sign-in between two revocations → both cookies 401, version 2; mutation below |
| M4 | a failing lookup with ALLOW_DEV_ADMIN=1 fell through to the dev admin | a present cookie decides alone (invalid/stale/unknown/DB error → 401); only a request without a cookie may use the dev admin | unit: lookup throws / null / stale `sv` / garbage with the flag on → 401; integration on the dev server: garbage cookie → 401, bumped version → 401 on `me` and `/api/users` |
| M5 | Next dev request logger prints `?token=` | `next.config.ts` `logging.incomingRequests.ignore: [/^\/auth\/confirm(\?\|$)/]` | integration: open a dev link in the browser + plain GET, then `server-dev.log` contains `GET /sign-in` but no token, no `token=`, no `/auth/confirm?` |

Mutation 3 (new): `revokeSessions` call in `signOutEverywhere` replaced by `findOne` → `sessionVersion += 1` → `flush` — the two-revocations test must fail (see Verification).

Verification after the fixes: `make check` exit 0 (tools/setup 51, db 30, ui 43, core 124, app 59 — 100 %; build; audit 1 high ignored); `make test-integration` → `Test Files 3 passed (3)`, `Tests 39 passed (39)` (auth 17, migrations 7, app 15). Mutations: (1) `await authorize` removed → 2 tests `expected 200 to be 401`; (2) `usedAt: null` removed → "rejects a link clicked twice" `promise resolved … instead of rejecting`; (3) read-then-write revocation → "two revocations with a sign-in between" `AssertionError: expected 1 to be 2`. All restored, suites green.

## Handoff

Phase 1 is complete; Jan opens the PR (`risk-high`, `run-integration`, `needs-qa`) and the Codex
`om-code-review` second-reviewer run per SDLC.md. Next phase by delivery order: Phase 3 (mentor sign-up,
#26). Open questions: none — see the spec's Progress block for the three documented deviations.
