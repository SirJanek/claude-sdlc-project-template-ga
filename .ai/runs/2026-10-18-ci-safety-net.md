# Run: CI safety net (build, lint, unit 100%, integration with testcontainers + agent-browser)

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-ci-safety-net.md](../specs/2026-10-18-ci-safety-net.md)
**Branch:** `feat/ci-safety-net` from `develop` (`f9027ab`)
**Status:** done — PR #5

## Decisions

- agent-browser 0.39 (Vercel Labs CLI) as the browser test driver, as requested; probed first:
  JSON output, exit code 1 on failure, isolated sessions via `AGENT_BROWSER_SESSION`, Chrome args
  via `AGENT_BROWSER_ARGS` (`--use-mock-keychain` so local runs never pop the macOS keychain dialog).

- **Integration builds into `.next-integration`** (`NEXT_DIST_DIR`) so it never clashes with a
  running `make dev`; servers on free ports; one container per run (Ryuk reaps on crash).
- **Dev-admin flag is development-only (allowlist)** — the suite showed `next start` with an
  inherited NODE_ENV=test opened the flag; fixed in core with a regression test.
- **No install-script approvals** for testcontainers (ssh2/cpu-features/protobufjs) or agent-browser
  (binaries ship in the package) — added, checked, reverted.
- **`.github/workflows/ci.yml` is a protected path** — added because Jan asked for CI explicitly;
  shared setup in `.github/actions/setup` (composite action) to keep six jobs DRY.
- Migration CLI logic moved to `db/src/migrator/run-command.ts`; `src/scripts/**` is the only
  coverage exclusion besides tests and configs.

## Steps

- [x] Phase 1 spec
- [x] Phase 2 unit framework + 100% (found and fixed: test file in src/migrations picked up as a migration; CrudForm error text inside <label> changed the accessible name)
- [x] Phase 3 integration (no install-script approvals needed for testcontainers or agent-browser — both reverted after checking)
- [x] Phase 4 CI + rules (CI result on the PR recorded below)

## Verification

- Local: `make check` exit 0 (14 s, 112 unit tests at 100% in all packages); `make test-integration`
  12/12 in 16 s, nothing left running.
- Mutations: two test files removed → `make test` exit 2; broken empty state → integration exit 1;
  old NODE_ENV condition → unit test exit 1.
- GitHub (PR #5, first Actions run ever in this fork): all six CI checks green; Integration 63 s
  on ubuntu-latest — the riskiest assumption held.
- Template "Claude review" workflow failed: Claude GitHub App not installed, no `ANTHROPIC_API_KEY`.

## Handoff

- **Next step:** Jan reviews/merges PR #5; decide branch protection (required checks) and whether to
  enable the Claude review workflow (install the Claude GitHub App + `ANTHROPIC_API_KEY` secret).
