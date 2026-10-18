# Spec: One-command idempotent local setup (`npm run setup`)

**Intent:** [intent.md](../../../docs/sdlc/intent.md) › Constraints › Process (AI-native SDLC: agents work in fresh worktrees) — no intent line asks for setup directly; requested in issue #13
**Issue:** #13
**Status:** implemented (PR #15, QA approved by Jan) · autonomous spec (`om-auto-write-spec`, assumptions below await Jan's confirmation) · revised after fresh-context review (8 findings applied) · edge cases amended after the implementation review on PR #15

## 📝 TLDR

A developer or agent on a fresh clone of MentorHub today runs four manual steps from README ›
*Uruchomienie lokalne* (`make install`, `make setup-browser`, `make db-up`, `make db-migrate`).
**Proposed:** one command — `make setup` (the documented interface, like every other target) or `npm run setup` / `pnpm run setup` (works without `make`, e.g. on Windows) — runs them all, checks
prerequisites first, and can be re-run at any time — finished steps are detected and reported as
skipped, an interrupted setup is completed, nothing is duplicated.

## 📝 Problem Statement

- Onboarding is four commands plus three prerequisites (Node ≥ 22, pnpm 10, Docker) that fail late
  and cryptically when missing (e.g. `make db-up` without a running Docker daemon).
- Agents working in fresh worktrees (the Open Mercato pipeline creates one per run) repeat the same
  steps; a single idempotent entry point makes "prepare the environment" one call.
- `make` is not available on a stock Windows machine; the steps are only documented as `make` targets.

## 📝 Proposed Solution

A small Node program with **no third-party dependencies** (it must run before `pnpm install`),
started by the root script `setup`. It executes an ordered list of steps; each step has a
`check()` (is it already done?) and a `run()`. Output is one line per step (`✔ done`, `↷ skipped`,
`✖ failed` + the fix) and a final hint (`make dev`). Exit code 0 when every step is done or
skipped, 1 on the first failure (later steps are not attempted).

| # | Step | Already done when | Action |
|---|---|---|---|
| 1 | Prerequisites | Node major ≥ 22 (`engines`), `pnpm --version` major = 10 (`packageManager` pins 10.34.5), `docker info` succeeds, `docker compose version` succeeds (step 4 needs Compose v2) | stop with a message naming the fix: "use the version in `.nvmrc` (26) via nvm/fnm"; "`npm i -g pnpm@10.34.5` (or `corepack enable` where corepack exists — Node ≥ 25 no longer ships it)"; "start Docker Desktop" |
| 2 | Dependencies | `node_modules/.pnpm/lock.yaml` exists and equals `pnpm-lock.yaml` (pnpm-internal file — see Risks; a false negative only costs a fast no-op install) | `pnpm install --frozen-lockfile` |
| 3 | Browser for integration tests | **No separate check** — the command is idempotent; it is run and classified afterwards: output matching `/is already installed/` (agent-browser 0.39.1 prints `✓ Chrome <version> is already installed`, verified 2026-10-18) → reported `skipped`, otherwise `done`; the string is pinned in a fixture test | `pnpm browser:install`; skipped entirely with `--skip-browser` |
| 4 | Database | `docker compose ps` reports service `db` running and healthy | `docker compose up -d --wait db` |
| 5 | Migrations | **No separate check** — `pnpm db:migrate` is idempotent; output `No pending migrations.` (`packages/db/src/migrator/run-command.ts:43`) → `skipped`, otherwise `done`. A test in `tools/setup` reads that source line, so rewording the migrator message fails the build instead of silently mis-reporting | `pnpm db:migrate` |

**Alternatives considered:** a `make setup` target (rejected: no `make` on Windows, and `make`
cannot express per-step skip reporting cleanly); a bash script (same Windows problem); a
TypeScript entry run with `tsx` (rejected: `tsx` is not available before `pnpm install`); Node's
native TypeScript execution (rejected: needs Node ≥ 23.6 without flags, `engines` says ≥ 22).

**Name clash:** `pnpm setup` is a built-in pnpm command (configures `PNPM_HOME`) and never runs
the package script. Docs say `make setup`, `npm run setup` or `pnpm run setup`.

**Interfaces:** `make setup` is the documented entry (BC §6 — Makefile targets are the contract);
the root script `setup` is the `make`-less path. Both call the same file.

## 📝 Architecture

New workspace package `tools/setup` (`@mentorhub/setup`, private), outside the product layers
(`app → core → db`, `ui`): nothing imports it and it imports nothing from the workspace.

```
tools/setup/
  package.json            test + typecheck scripts, no runtime dependencies
  bin/setup.mjs           one line: `process.exitCode = await run(process.argv.slice(2))`
  src/cli.mjs             `run(argv, deps = realDeps)` — argument parsing, wiring, exit code (tested)
  src/steps.mjs           the five steps (check/run), each taking an injected `exec`
  src/main.mjs            orchestration and reporting
  src/exec.mjs            child_process wrapper (spawn, capture, cross-platform `pnpm`/`docker`)
  src/*.test.mjs          unit tests with a fake `exec` and fake file reads
```

- Plain ESM JavaScript with JSDoc types and `// @ts-check`; `typecheck` runs `tsc` with
  `checkJs`, so the AGENTS.md typecheck gate still applies.
- Root `package.json`: `"setup": "node tools/setup/bin/setup.mjs"`; `pnpm-workspace.yaml` adds
  `tools/*`, so `pnpm -r test` / `pnpm -r typecheck` include it and CI's unit job enforces 100%.
- Coverage: `unitTestConfig()` in `vitest.shared.ts` gains an `extensions` option (default
  `ts,tsx` — the four existing packages are unchanged); `tools/setup` passes `mjs`.
- **Coverage exclusion (decision for Jan):** `bin/setup.mjs` is outside `src/`, so it is not
  measured. It is the same pattern as the excluded `packages/db/src/scripts/**` thin CLI entries
  (AGENTS.md › Testing): one line, all logic in the tested `run()`. AGENTS.md's exclusion list is
  extended by this spec to name `tools/*/bin/**` explicitly.
- Reuses existing contracts: Makefile targets stay as they are; the installer calls the same
  commands (`pnpm install --frozen-lockfile`, `pnpm browser:install`, `docker compose up -d --wait db`,
  `pnpm db:migrate`).

## 📝 Data Model

None. The installer never touches the schema directly — migrations run through the existing
migrator. It must **not** create, read, or modify `.env*` files (README: defaults match
`docker-compose.yml`, so no `.env` is needed).

## 📝 API Contracts

CLI only: `npm run setup [-- --skip-browser]` · `pnpm run setup [--skip-browser]`. Unknown flags →
usage message, exit 1. No HTTP surface changes.

## 📝 Edge Cases & Failure Scenarios

| Situation | User sees |
|---|---|
| Docker installed but daemon stopped | `✖ Docker is not running — start Docker Desktop and re-run npm run setup` (no stack trace) |
| pnpm missing | `✖ pnpm not found — run "corepack enable" (pnpm version is pinned in package.json)` |
| Port 5433 taken by another process | step 4 fails with compose's message + hint `make db-down` or free the port |
| Database container exists but stopped | step 4 not skipped; `up -d --wait` restarts the **same** container and volume (verified live on PR #15) |
| Another checkout of the repo (e.g. an agent worktree — Compose names the project after the folder) already serves its DB on 5433 | **not reused** — this branch's migrations would land in that database; step 4 fails with the port hint, which names `COMPOSE_PROJECT_NAME=<that project>` for deliberate sharing (Compose leaves a `created` container behind; `docker compose down -v` removes it) |
| Interrupted mid-install (Ctrl-C) | next run: step 2 lock files differ → install runs again (pnpm resumes) |
| Lockfile changed after `git pull` | step 2 not skipped → reinstall |
| Offline machine with everything installed | all steps skipped except the ones needing network (none when complete) |
| A command exits non-zero | stop, print its last output lines and the step's hint, exit 1 |
| `package.json` and `pnpm-lock.yaml` out of sync | `--frozen-lockfile` fails by design → print pnpm's message + hint `pnpm install` (update the lockfile deliberately, then re-run) |

## 📝 Risks & Impact Review

- Additive only: new script `setup`, new workspace package, no change to existing targets or CI
  job names (`BACKWARD_COMPATIBILITY.md` §6 — inventory updated in the same PR).
- Runs commands on developer machines; the command list is fixed in code (no shell interpolation of
  user input, `spawn` with argument arrays, `shell: true` only for the Windows `.cmd` shims).
- Adding a workspace package changes `pnpm-lock.yaml` importers (reviewed in the PR).
- Step 2 relies on pnpm's internal `node_modules/.pnpm/lock.yaml`; if a pnpm upgrade moves it, the
  check returns "not done" and the install runs as a no-op — correct, just not reported as skipped.
- Steps 3 and 5 classify command output; both strings are pinned by tests (see the step table).
- Rollback: remove the package and the script — nothing else depends on them.

## 📋 Phasing

One phase — the capability is only useful whole (a setup that does half the steps is not a setup).

## 📋 Implementation Plan

**Accepted:** 2026-10-18 by Jan (spec PR #14 merged; QA approved on PR #15) — resolved assumptions below stand.

| Step | What | Done when |
|---|---|---|
| 1.1 | Workspace package `tools/setup` (package.json, tsconfig with `checkJs`, vitest config via `unitTestConfig({ extensions })`), `pnpm-workspace.yaml` + lockfile | `pnpm -r test` passes in **all** packages after the `vitest.shared.ts` change; `make lint` (ESLint + Prettier on `.mjs`) and `make typecheck` pass with `tools/setup` included |
| 1.2 | `exec.mjs` + `steps.mjs`: the five steps with injected `exec`/file reads; unit tests for every skip/run/fail branch | 100% coverage of `src/` |
| 1.3 | `main.mjs` + `cli.mjs` + one-line `bin/setup.mjs`: ordering, stop-on-failure, `--skip-browser`, unknown-flag usage, report lines, exit codes; unit tests incl. "second run → all skipped", each prerequisite message, the pinned browser/migrator strings | 100% coverage; `make check` green |
| 1.4 | `make setup` target + root script `setup`; README › Uruchomienie lokalne: `npm run setup` first, manual `make` steps kept as the alternative, `pnpm setup` warning; AGENTS.md › Commands and › Testing (exclusion `tools/*/bin/**`); `BACKWARD_COMPATIBILITY.md` §6 inventory (`setup` target and script) | docs updated |
| 1.5 | Evidence: run `npm run setup` twice on a clean worktree (first: steps done; second: all skipped) and once with the DB container stopped (step 4 restarts it); paste the output in the PR | evidence in the PR body |

### Progress

| Step | Status | Evidence |
|---|---|---|
| 1.1–1.5 | ✅ | PR #15 — `make check` green (48 tests in `tools/setup`, 100%), 10/10 mutants killed, live runs in the PR body; fresh-context review: 6 findings fixed; QA finding (check output noise) fixed; `QA head: b275824` |

## Resolved assumptions (autonomous defaults)

| # | Question | Applied default | Why |
|---|---|---|---|
| Q1 | Where does the installer logic live? | Workspace package `tools/setup` (plain ESM + JSDoc, `checkJs`) | Runs before dependencies exist, yet stays under the existing 100% unit gate and typecheck without a new coverage exclusion; reversible (one folder). |
| Q2 | Is the browser step on by default? | Yes, `--skip-browser` opts out | README's local setup already lists it; it is idempotent; integration tests fail without it. |
| Q6 | Is a one-line untested `bin/` entry acceptable (coverage exclusion `tools/*/bin/**`)? | Yes — same pattern as `packages/db/src/scripts/**` | All logic is in the tested `run()`; the alternative (spawning the CLI in a test) adds a slow process test for one line. |
| Q3 | How is idempotency proven? | Unit tests (second run = all skipped) + a manual double run as PR evidence; no integration test | Lowest blast radius: an integration test would need Docker-in-CI for the installer itself; integration stays on demand. |
| Q4 | Should `npm run setup` also start the dev server or seed data? | No — non-goals (issue #13); `make dev` stays separate, there is no seeder yet | Smallest scope that ships a working setup. |
| Q5 | Split into several specs? | No — one capability (each step alone is not a setup) | Scope-cohesion check. |

No assumption weakens security, data scoping, or a `BACKWARD_COMPATIBILITY.md` contract, so none is
marked for mandatory confirmation; all are reversible before merge.

**Moved out of scope after review:** ignoring `.ai/tmp/` (pipeline worktrees) in `.gitignore` —
unrelated to setup, goes in its own small PR.
