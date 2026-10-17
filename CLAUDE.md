# MentorHub

<!--
Shared instructions for all agents live in AGENTS.md and are imported below — edit shared
rules there, not here. This file adds only what is specific to Claude Code.
Keep both files to ONE page combined: they are read on every turn.
-->

@AGENTS.md

## Claude Code specifics

- The `.ai/` workspace rules in AGENTS.md apply to Claude Code too: read `.ai/lessons.md`
  first, specs in `.ai/specs/YYYY-MM-DD-slug.md`, a log in `.ai/runs/` for every autonomous
  run (including `claude -p`, subagents doing multi-step work and auto mode), lessons in
  `.ai/lessons.md`; check `.ai/skills/<skill-name>/` before running a skill or `/sdlc-*` command.

- Start in **plan mode** (Shift+Tab) with the relevant spec in `.ai/specs/`. Nested `packages/*/AGENTS.md`
  files are loaded when you work in a package — read the one for the package you touch.
- Stage commands: `/sdlc-intent`, `/sdlc-spec`, `/sdlc-plan`, `/sdlc-verify`, `/sdlc-incident`.
  Subagents: `spec-reviewer` (before planning), `verifier` (checks, never fixes).
- Hooks enforce the hard rules from AGENTS.md (`protect-paths`, `no-test-edits`,
  `release-gate`) and format after each edit. When a hook blocks, do not work around it —
  tell the human; protected paths need them to re-run with `SDLC_ALLOW_PROTECTED=1`.

## Things Claude gets wrong

<!--
Append-only, Claude-only traps. Shared traps go to AGENTS.md → Things agents get wrong.
One line per mistake, phrased as the correction. Both sections are eval sources.
-->
