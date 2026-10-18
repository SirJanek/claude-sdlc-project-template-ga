# Run: merge gate on develop + one-command browser setup

**Date:** 2026-10-18 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** [.ai/specs/implemented/2026-10-18-merge-gate.md](../specs/implemented/2026-10-18-merge-gate.md)
**Branch:** `feat/merge-gate` from `develop` (`5ae0828`)
**Status:** done — PR #8 (browser setup), branch protection via API, trial PR #9 closed unmerged

## Decisions

- Browser setup merged **before** the protection, so the gate was tested separately on a
  deliberately red PR instead of on real work.
- Required checks pinned to the GitHub Actions app (`app_id` 15368) — a status posted by another
  integration under the same name does not satisfy them.
- `strict: true` (branch must be up to date with develop), PR required with **0 approvals** (solo
  project: GitHub does not let the author approve their own PR), `enforce_admins: true`, no force
  pushes, no deletion.
- Claude review and the evals jobs are **not** required (review disabled until L03).

## Verification

- PR #8: CI run 39088770149 — 6/6 green; `make setup-browser` locally reports Chrome 155 installed.
- Direct `git push origin HEAD:develop` → `GH006: Protected branch update failed … 6 of 6 required
  status checks are expected`.
- Trial PR #9 (failing unit test): Unit tests + Lint red → `mergeStateStatus: BLOCKED`. No merge
  attempt with `--admin` was made (blocked by the agent's auto-mode classifier as a CI bypass —
  correct; `enforce_admins` makes it fail anyway).
- This docs change also went through a PR — there is no other way onto develop now.
