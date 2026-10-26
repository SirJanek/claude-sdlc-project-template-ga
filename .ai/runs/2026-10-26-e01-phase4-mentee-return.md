# Run: E01 Phase 4 — mentee return-to-slot (#27)

**Date:** 2026-10-26 · **Agent:** Claude Code (Haiku 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-accounts-and-roles.md](../specs/2026-10-18-accounts-and-roles.md) › Implementation Plan › Phase 4
**Tracker:** #27 (E01-S02) · **PR:** #54 · **Branch:** `feat/e01-phase4-mentee-return` · **Label:** `risk-high` (second reviewer in Codex)
**Status:** done on the branch; PR #54 waits for the merge. The spec stays in `.ai/specs/` until the merge.

## Goal

Phase 4 only: a visitor who opens a guarded page with `?slot=` signs in by e-mail link and lands back on the exact
URL with a verified session (AC1); `requireVerified` answers `403 email_unverified` for an unverified session (AC2);
the `next` value is validated on both sign-in flows (open redirect rejected). AC3 (another person opening a mentee's
bookings) moved to E03-S01.

## Decisions

- **`next` is validated by `nextPathSchema` on every entry point** (T1, `0b3eab2`). The helper rejects
  off-origin and protocol-relative values; the unit test (`next-path.schema.test.ts`) pins the open-redirect cases.
- **`requireVerified` is additive** (T2, `01eb1c5`): new exports `EmailUnverifiedError`, `requireVerified`,
  `requireVerifiedSession`; existing `Session` fields and routes unchanged. E03 booking routes consume it.
- **AC1 is an integration test, not a unit test** (T3, `7074962`): the browser-level path is the only proof that
  the query survives the guard, the sign-in redirect and the e-mail round trip.
- **Design-token fix in the same PR** (`9cc078d`): the Codex review of PR #54 blocked on the `Design tokens` CI
  gate (45 palette classes in the E01 auth screens). Only existing semantic tokens were used; no colour was added.

## Steps

- [x] T1 validated `next` through sign-in flows (`0b3eab2`)
- [x] T2 `requireVerified`, AC2 (`01eb1c5`)
- [x] T3 integration AC1, return to slot (`7074962`)
- [x] Review fix: Design tokens gate 45 → 0 (`9cc078d`)
- [x] Close-out: spec progress row, track, this run log (last commit of the PR)

## Verification

- `make lint-tokens` → exit 0 after the fix (`lint-tokens: OK (packages/ui/src, packages/app/src)`); its own
  test file 10/10.
- **Mutation of the gate:** a temporary file with `bg-red-50 text-slate-700` makes `lint-tokens` exit 1 with both
  classes reported (the gate is not vacuous).
- `make check` → exit 0 (lint, typecheck, unit tests in every package, build, audit). Prettier needed one fix in
  `check-email/page.tsx` (line wrap) before the pass. Unit tests: tools/setup 51, db 30, ui 81, core 200, app 83.
- `make test-integration` → 57/57 in two consecutive runs (`Test Files 6 passed (6)`). The flake named in the
  review (first session test loses the socket, 401 at the session assertions) did **not** reproduce in these two
  runs, so no test code was changed.
- Visual change from the token mapping: links and the primary button move from indigo to the warm accent
  (`accent-600`/`accent-700`), and the primary hover goes darker (`primary-hover`) instead of lighter
  (`indigo-500`). Status colours for the error and warning boxes come from `status-danger` and `status-warning`.

## Handoff

Merge PR #54 after the CI gates are green on the head commit (Design tokens, Integration, Build, Audit) and the Codex
second review is approved. Then move the spec to `.ai/specs/implemented/` (done in the merge step, not here).
