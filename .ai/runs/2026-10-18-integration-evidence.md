# Run: integration evidence in CI, cached Chrome, action bumps

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/2026-10-18-integration-evidence.md](../specs/2026-10-18-integration-evidence.md)
**Branch:** `feat/integration-evidence` from `develop` (`6865864`, after PR #4 and #5)
**Status:** in progress

## Decisions

- Upload with `if: always()` — evidence matters most when tests fail (the course example shows the
  upload only after a green run).
- Bump actions to current majors found via the GitHub API (checkout v7.0.1, setup-node v7.1.0,
  upload-artifact v7.0.2, cache v6.1.0, pnpm/action-setup v6.1.0).

## Handoff

- **Next step:** phase 2 CI checks on the PR (artifact present, cache hit on a rerun).
