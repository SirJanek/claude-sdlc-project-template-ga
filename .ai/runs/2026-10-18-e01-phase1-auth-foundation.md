# Run: E01 Phase 1 — auth foundation and e-mail link (#44)

**Date:** 2026-10-18 · **Agent:** Claude Code (Fable 5.1, subagent) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-accounts-and-roles.md](../specs/2026-10-18-accounts-and-roles.md) › Implementation Plan › Phase 1
**Tracker:** #44 (E01-T01) · **Branch:** `feat/e01-phase1-auth-foundation` (worktree `…-wt/e01-phase1`)
**Status:** in progress

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

## Steps

- [ ] 1 env + limits
- [ ] 2 migration
- [ ] 3 session primitives
- [ ] 4 async requireSession + makeCrudRoute await (mutation)
- [ ] 5 mail port
- [ ] 6 AuthService (mutation)
- [ ] 7 routes + pages
- [ ] 8 set-role CLI
- [ ] 9 docs/contracts + integration
- [ ] 10 spec progress

## Verification

(filled at the end: `make check`, `make test-integration`, the two mutation checks)

## Handoff

Next step: see the unchecked box above. Open questions: none yet.
