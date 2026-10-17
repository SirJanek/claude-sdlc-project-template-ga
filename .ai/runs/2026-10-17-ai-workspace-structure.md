# Run: create the `.ai/` agent workspace

**Date:** 2026-10-17 20:17:03 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** none — course prompt (AI Tech Leaders, repo-for-agents lesson), applied 1:1 by decision of the product owner
**Status:** done

## Goal

Create `.ai/specs/` (with `implemented/`, `archive/`), `.ai/runs/`, `.ai/lessons.md` and
`.ai/lessons/`; describe the structure in AGENTS.md and CLAUDE.md with rules that enforce it.

## Decisions

- Applied exactly as in the course. Not reconciled with `docs/sdlc/` (template SDLC
  artifacts, `/sdlc-*` commands, `docs/sdlc/LESSONS.md`) — product owner chose "1:1 as in the
  course"; AGENTS.md says the relation is undecided so agents do not move content between them.
- Rules live in AGENTS.md (read by every agent); CLAUDE.md imports it and adds one pointer
  that the rules cover Claude Code runs too.

## Files changed

- `.ai/lessons.md` (new), `.ai/specs/implemented/.gitkeep`, `.ai/specs/archive/.gitkeep`,
  `.ai/lessons/.gitkeep` (keep empty folders in git), this run log
- `AGENTS.md` — section "Agent workspace: `.ai/` (mandatory)"
- `CLAUDE.md` — pointer in "Claude Code specifics"
- `README.md` — `.ai/` row in the repo structure table

## Verification

- `claude -p` without tools and `codex exec` (read-only) asked where a run log goes and in
  what name format — both answered from AGENTS.md (evidence in the commit message).

## Handoff

- **Next step:** product owner decides how `.ai/specs` relates to `docs/sdlc/spec.md` and the
  `/sdlc-*` commands (options were: course primary with template as format; template primary
  with `.ai/specs` as history).
- **Open questions:** should `docs/sdlc/LESSONS.md` (production incidents) and
  `.ai/lessons.md` (agent learnings) stay separate?
