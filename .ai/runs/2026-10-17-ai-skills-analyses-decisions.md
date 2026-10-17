# Run: close the gaps against the course description of `.ai/`

**Date:** 2026-10-17 20:41:08 · **Agent:** Claude Code (Opus 5.5) · **Requested by:** Jan
**Spec:** none — gap check of the repo against the AI Tech Leaders "session = one dev day" text
**Status:** done

## Goal

Fix the three gaps found: no place for skill extensions in `.ai/`, run logs not required to
record decisions, requirement analyses not reachable from `.ai/`.

## Decisions

- **Analyses stay in `docs/discovery/`, indexed from `.ai/analyses/README.md`** (option B,
  chosen by Jan). Why: the analysis and prototype are read by people, and a dot-folder is hidden
  in Finder/Explorer. Rejected: option A — move to `.ai/analyses/` and rewrite links in README,
  AGENTS.md and intent.md.
- **`.ai/skills/` holds only deltas** (`Extends:` / `Overrides:` a base skill, same folder name);
  base skills stay in `.claude/skills/` or global installs because that is where tools load
  them. Why: copies of base skills would drift. Rejected: moving template skills into `.ai/`
  (Claude Code would stop loading them).
- **Decisions became a required section of run logs** (rule 3) and the gap was recorded as a
  lesson in `.ai/lessons.md` — it came from a human correction (rule 4).

## Files changed

- `.ai/skills/README.md`, `.ai/analyses/README.md` (new)
- `AGENTS.md` — table rows for `skills/` and `analyses/`; rule 3 adds Decisions; new rule 5
  (skills and analyses); old rule 5 → 6
- `CLAUDE.md` — pointer to check `.ai/skills/` before skills and `/sdlc-*` commands
- `README.md` — `.ai/` row lists `skills/` and `analyses/`
- `.ai/lessons.md` — first lesson

## Verification

- `claude -p` without tools answered where skill overrides live, which section run logs need,
  and where to find requirement analyses (see commit message).

## Handoff

- **Next step:** none for this run. Coding standards, patterns, DB structures and nested
  AGENTS.md files come after the stack is chosen (course L02 / first plan).
- **Open questions:** relation of `.ai/specs` to `docs/sdlc/spec.md` is still undecided.
