# Run: CI safety net (build, lint, unit 100%, integration with testcontainers + agent-browser)

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-ci-safety-net.md](../specs/2026-10-18-ci-safety-net.md)
**Branch:** `feat/ci-safety-net` from `develop` (`f9027ab`)
**Status:** in progress

## Decisions

- agent-browser 0.39 (Vercel Labs CLI) as the browser test driver, as requested; probed first:
  JSON output, exit code 1 on failure, isolated sessions via `AGENT_BROWSER_SESSION`, Chrome args
  via `AGENT_BROWSER_ARGS` (`--use-mock-keychain` so local runs never pop the macOS keychain dialog).

## Steps

- [x] Phase 1 spec
- [x] Phase 2 unit framework + 100% (found and fixed: test file in src/migrations picked up as a migration; CrudForm error text inside <label> changed the accessible name)
- [x] Phase 3 integration (no install-script approvals needed for testcontainers or agent-browser — both reverted after checking)
- [ ] Phase 4 CI + rules

## Handoff

- **Next step:** phase 2.
