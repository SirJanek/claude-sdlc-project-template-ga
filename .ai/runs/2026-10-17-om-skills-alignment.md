# Run: align the repo with Open Mercato skills (no setup yet)

**Date:** 2026-10-17 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** none — course material "SDLC i skille" (AI Tech Leaders)
**Status:** done

## Goal

Check what the Open Mercato `om-*` skills expect from the repo structure and remove conflicts,
without installing skills or running `/om-setup-agent-pipeline` (the course says: lesson 3).

## Findings

- Every `om-*` skill loads `.ai/agentic.config.json` first and stops without it; setup also
  writes `.ai/trackers/<tracker>.md` and missing SDLC.md, CODE_REVIEW.md,
  BACKWARD_COMPATIBILITY.md, AGENTS.md starter.
- Default paths: runs `.ai/runs` ✓, specs `.ai/specs` ✓, analysis `.ai/analysis` (ours:
  `.ai/analyses`), prototypes `.ai/prototypes` (ours: `docs/discovery/mockups`), dataModel,
  scripts, qa — all configurable in `paths`.
- Overrides in `.ai/skills/<om-name>/SKILL.md` match our folder; their contract forbids relaxing
  safety/quality rules — ours did not say so.
- `om-*` skills are installed only in the author's vault, not in this repo.

## Decisions

- **No install, no setup now** — course order: stack (L02) → safety net → OM pipeline (L03).
  Rejected: setting up now (option A) — validation would only hit failing `make` stubs.
- **Map paths in config instead of renaming folders** (`analysis` → `.ai/analyses`,
  `prototypes` → `docs/discovery/mockups`). Rejected: renaming `.ai/analyses` and moving the
  prototype — churn in links for no gain.
- **Override contract aligned with om** in `.ai/skills/README.md` and AGENTS.md rule 5.
- **GitHub as the single source of truth** recorded in AGENTS.md › Architecture (course
  decision, confirmed by Jan mid-run): issues = tasks, PRs = code and specs in `.ai/specs`,
  labels = states. Rejected for now: GitHub Projects/Kanban, Linear + GitHub, Jira + GitHub —
  `om-*` skills support them via `tracker`, revisit only if the team needs it.

## Files changed

- `.ai/skills/README.md`, `AGENTS.md` (rule 5 wording; Open Mercato note with L03 settings)

## Verification

- `claude -p` without tools answered whether to run `/om-setup-agent-pipeline` now and which
  validation command it will get (see commit message).

## Handoff

- **Next step (L03):** install `om-*` into this repo (`npx skills add open-mercato/skills -a
  claude-code`), run `/om-setup-agent-pipeline` with the settings listed in AGENTS.md, decide
  the primary SDLC description.
