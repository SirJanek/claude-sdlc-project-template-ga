# Run: integration evidence in CI, cached Chrome, action bumps

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/implemented/2026-10-18-integration-evidence.md](../specs/implemented/2026-10-18-integration-evidence.md)
**Branch:** `feat/integration-evidence` from `develop` (`6865864`, after PR #4 and #5)
**Status:** done — PR #6

## Decisions

- Upload with `if: always()` — evidence matters most when tests fail (the course example shows the
  upload only after a green run).
- Bump actions to current majors found via the GitHub API (checkout v7.0.1, setup-node v7.1.0,
  upload-artifact v7.0.2, cache v6.1.0, pnpm/action-setup v6.1.0).

## Verification

- Local: 12/12; evidence complete; broken page → `FAILED-…` screenshot; clean rerun removes it.
- CI run 39086192364: green but **no artifact** — upload-artifact skips the hidden `.evidence`
  folder and `if-no-files-found: warn` hid it. Fixed (`include-hidden-files: true`,
  `if-no-files-found: error`); Chrome cache saved (179 MB).
- CI run 39086347486: green; artifact downloaded and checked (4 screenshots from the Linux runner,
  4 logs, junit 12 tests / 0 failures, results.json); Chrome restored from cache.

## Claude review (decision D)

- Claude GitHub App installed and `CLAUDE_CODE_OAUTH_TOKEN` added by Jan; PR #6 run was skipped by the
  action's own guard (workflow file must match the default branch); PR #7 run failed: "Unable to
  verify organization … a860e8b8-…" — the token belongs to the C&F company account whose managed
  policy (`forceLoginOrgUUID`) follows it into CI.
- Options were: personal Pro/Max token, personal API key, ask C&F IT, disable. **Jan chose D:**
  workflow disabled with `gh workflow disable "Claude review"` (file kept), back in L03.

## Handoff

- **Next step:** none — PR #6 merged, spec moved to `implemented/`.
