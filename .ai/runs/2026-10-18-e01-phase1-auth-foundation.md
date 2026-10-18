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

## Handoff

Phase 1 is complete; Jan opens the PR (`risk-high`, `run-integration`, `needs-qa`) and the Codex
`om-code-review` second-reviewer run per SDLC.md. Next phase by delivery order: Phase 3 (mentor sign-up,
#26). Open questions: none — see the spec's Progress block for the three documented deviations.
