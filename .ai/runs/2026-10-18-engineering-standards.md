# Run: adopt the engineering standards (migration steps 1–3)

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-engineering-standards.md](../specs/2026-10-18-engineering-standards.md)
**Standard:** [.ai/docs/engineering-standards.md](../docs/engineering-standards.md)
**Branch:** `feat/engineering-standards` from `feat/stack-bootstrap` (PR #2 not merged yet)
**Status:** done — PR targeting `feat/stack-bootstrap`

## Decisions

- Scope: migration steps 1–3 + docs; `events/` and `validators/` wait for the first feature
  (standard's own YAGNI rule) — Jan.
- `/api/users` behind a fail-closed dev flag (`ALLOW_DEV_ADMIN=1` and not production) until the
  auth spec — Jan. Rejected: auth first (blocks the reference example); no API route (the
  standard requires the route + apiCall example).
- Standard stored in `.ai/docs/`, adapted to MentorHub (`@mentorhub`, mentee, our screen IDs,
  `make`, dev flag, health escape hatch) — Jan.
- **Dependency direction changed to `app → core → db`** (standard) — supersedes the stack-bootstrap
  design where container/services lived in `app` and `db` could import `core`.
- **Migration 2 hand-written as a rename** — the generator emitted `create users` + `drop user
  cascade` (data loss). Rehearsed up → down → up with 2 rows; generator now reports no changes.
- **shadcn CLI 4.22 output kept as generated** — it imports `cn` from the new `cn` npm package
  (installed by the CLI) and `radix-ui`; hand-written primitives deleted. `lib/utils.ts`
  re-exports `cn` for our own code.
- **`apiHandler` Response escape hatch** for `/api/health` (monitor contract 200/503 `{status, db}`),
  documented in the standard's adaptations.
- **`RouteContext.params: Promise<object>`** — Next's route type validator rejects a
  `Record<string, …>` params type on routes without those params.
- **`pnpm audit` exception GHSA-vfj7-8cjw-p6xm** (braces ReDoS, high) in `pnpm-workspace.yaml` —
  dev-only path through lint tooling, no patched version exists. Verified that removing the
  exception makes `pnpm audit` exit 1. Rejected: `--prod` only (would stop gating dev deps).
- `make dev` sets `ALLOW_DEV_ADMIN=1`; `next start` (production) ignores it — verified live.
- Stacked branch on `feat/stack-bootstrap`; PR retargeted to `develop` after PR #2 merges.

## Steps

- [x] Phase 1 docs (`dbafdfe`)
- [x] Phase 2 structure & direction (`f25fdf0` + `3327425` — see incident below)
- [x] Phase 3 shared layers (`c30793b`)
- [x] Phase 4 reference example + docs

## Incident

`f25fdf0` went out without its new files: a `git add` with a stale pathspec aborted, and its
error was silenced with `2>/dev/null`. Fixed by the follow-up commit `3327425` (history not
rewritten); lesson recorded in `.ai/lessons.md`. Later commits check `git status --short` is empty.

## Verification

- `make check` (lint incl. boundaries, typecheck ×4, 40 unit tests, build, `pnpm audit`) → exit 0.
- Lint-boundary mutations 13/13 caught (react/next/@mikro-orm in core, core in db/ui, db in ui,
  @mikro-orm in app, raw fetch, window.fetch, any, console.log, empty catch).
- Live (dev with flag): `GET /api/users` 200 envelope; POST without header 403, with header 405;
  `/admin` 307 → `/admin/users`; health 200. Dev without flag: 401. **Production with the flag: 401.**
  Production health: 200 up, 503 with the DB stopped.
- Headless Chrome on `/admin/users`: data (styled DataTable), empty, DB-down error with generic
  message and retry, recovery after restart — 6/6; unauthorized state without the flag; `/`
  unchanged.
- `claude -p` from the repo root answers dependency direction, shadcn placement, CRUD route
  pattern and the dev-flag rule from AGENTS.md.

## Handoff

- **Next step:** review/merge PR #2, then this PR (retarget to `develop`); then the auth spec
  (JWT/bcrypt/cookies/rate limit per the standard) to replace the dev flag; CI safety net.
- Root `AGENTS.md` is ~236 lines — over the "one page" guideline; consider moving detail into
  nested AGENTS.md files or the standard.
