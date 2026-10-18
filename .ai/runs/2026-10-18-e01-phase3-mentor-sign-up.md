# Run: E01 Phase 3 — mentor sign-up (#26)

**Date:** 2026-10-18 · **Agent:** Claude Code (Fable 5.1, subagent) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-accounts-and-roles.md](../specs/2026-10-18-accounts-and-roles.md) › Implementation Plan › Phase 3
**Tracker:** #26 (E01-S01) · **Branch:** `feat/e01-phase3-mentor-sign-up` (stacked on `feat/e01-phase1-auth-foundation`, worktree `…-wt/e01-phase3`)
**Status:** in progress

## Goal

Phase 3 only: `/sign-up/mentor` (e-mail link with `intentRole: 'mentor'`; the GitHub button is Phase 2),
`/mentor/profile` placeholder in a new `(mentor)` group (mentor role required, no payout/bank/Stripe field or
step — R07), role-aware landing after a consumed link, and the existing-account notice (AC3 as reworded in #26:
signed in to the existing account, role unchanged, nothing created, no e-mail enumeration).

## Decisions

(filled in as the work progresses — see the bottom of this file for the final list)

## Steps

- [ ] 1 core: role-aware landing + existing-account notice in `AuthService.consumeEmailLink`, `landing-path.ts`, `account-notice.schema.ts`, `page-access.ts`
- [ ] 2 ui: `ExistingAccountNotice`
- [ ] 3 app: `/sign-up/mentor`, shared `EmailLinkForm`, `/check-email?role=mentor`, `/mentor/profile`, notice on `/`
- [ ] 4 integration: `tests/integration/mentor-sign-up.test.ts`
- [ ] 5 docs: AGENTS.md, BACKWARD_COMPATIBILITY.md §1, spec Progress, this run

## Verification

(pending)

## Handoff

(pending)
