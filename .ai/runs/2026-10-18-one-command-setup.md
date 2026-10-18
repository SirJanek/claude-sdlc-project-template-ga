# Execution plan: one-command idempotent local setup

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) via `om-auto-fix-issue` → `om-auto-implement-spec` → `om-auto-create-pr`
**Issue:** #13 · **Spec PR:** #14
Source doc: .ai/specs/2026-10-18-one-command-setup.md

## Goal

`make setup` / `npm run setup` / `pnpm run setup` prepares a fresh clone end to end and is safe to re-run.

## Scope

New private workspace package `tools/setup` (no runtime dependencies), `make setup` target, root
`setup` script, `vitest.shared.ts` `extensions` option, docs (README, AGENTS.md, BACKWARD_COMPATIBILITY.md §6).

**Non-goals:** dev server, seeding, `.env` handling, CI provisioning, changing existing targets,
`.gitignore` for `.ai/tmp/` (separate PR).

## Implementation Plan

### Phase 1: Installer

1. Package scaffold + workspace wiring + shared vitest option (all packages still green; lint/typecheck cover `.mjs`).
2. `exec.mjs` + `steps.mjs` with unit tests for every branch.
3. `main.mjs` + `cli.mjs` + one-line `bin/setup.mjs`; tests incl. second run = all skipped, pinned strings.
4. `make setup`, root script, README / AGENTS.md / BC §6.
5. Evidence: double run + stopped-DB run on a clean worktree.

## Risks

pnpm-internal `node_modules/.pnpm/lock.yaml` (false negative = no-op install); output classification
for browser/migrations pinned by tests; Windows `.cmd` shims need `shell: true` for `pnpm`.

## Progress

PR: #15

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Installer

- [x] 1.1 Package scaffold, workspace wiring, shared vitest option — 852ae2c
- [x] 1.2 exec and steps with unit tests — c385e46
- [x] 1.3 main, cli and bin entry with unit tests — 83ccd4a
- [x] 1.4 make target, root script and docs — fa7e490
- [x] 1.5 Evidence runs — PR body (fresh-clone run, re-run, make path, no-Docker failure, unknown flag)

### Review (om-auto-review-pr --autofix)

- [x] R.1 Fresh-context review: request changes (2 major, 2 minor, 2 nits) — all fixed — d88ae3c
- [x] R.2 Live stopped-container and other-checkout runs (PR comment); spec edge cases amended on PR #14
- [x] R.3 QA finding (Jan, manual run): check output buried the results → quiet checks + failure tail + screen test — 8711f4f
