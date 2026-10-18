# Spec: Merge gate on develop and one-command browser setup

**Intent:** [intent.md](../../docs/sdlc/intent.md) › Constraints (AI-native SDLC process) — enabling work
**Builds on:** [2026-10-18-ci-safety-net.md](implemented/2026-10-18-ci-safety-net.md), [2026-10-18-integration-evidence.md](implemented/2026-10-18-integration-evidence.md)
**Status:** accepted · requested by Jan on 2026-10-18 ("tak działaj" — close the two gaps against the course summary)

## Scope

**In:** a `make setup-browser` / `pnpm browser:install` command that installs the agent-browser
headless Chrome, used automatically by `make test-integration`; README/AGENTS.md updated; branch
protection on `develop` requiring the six CI checks and a pull request (no direct pushes, no force
pushes, no deletion, admins included).

**Out:** required human approvals (solo project — the author cannot approve their own PR);
re-enabling Claude review (L03).

## Acceptance criteria

1. Given a fresh clone with Docker, when `make install && make test-integration` runs, then the
   agent-browser Chrome is installed (or reported as already installed) before the suite starts.
2. Given `develop`, then merging requires the checks **Lint**, **Typecheck**, **Unit tests (100%
   coverage)**, **Build**, **Integration (testcontainers + agent-browser)** and **Audit** to pass on
   a branch that is up to date with `develop`; changes arrive only through pull requests; force
   pushes and branch deletion are blocked; the rules apply to admins too.
3. Given a pull request with a failing check, when someone tries to merge it, then GitHub refuses.

## Implementation plan

**Accepted:** 2026-10-18 by Jan

| Phase | What | Done when |
|---|---|---|
| 1 Browser setup | `pnpm browser:install`, `make setup-browser`, `test-integration` depends on it, docs | AC 1; PR green and merged |
| 2 Merge gate | branch protection via the GitHub API; verify with a deliberately failing PR | AC 2–3 |

### Progress

| Phase | Status | Evidence |
|---|---|---|
| 1 Browser setup | ⏳ | |
| 2 Merge gate | ⏳ | |
