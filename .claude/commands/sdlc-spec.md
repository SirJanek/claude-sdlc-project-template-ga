---
description: Stage 2 — turn the accepted intent.md into a spec in .ai/specs/, then have it reviewed
argument-hint: [slug, optional: what to focus on]
---

Use the `spec-writer` skill.

Read `docs/sdlc/intent.md` and write a new spec at `.ai/specs/YYYY-MM-DD-<slug>.md` (today's
date, kebab-case slug from $ARGUMENTS or proposed by you), using the section format in
`docs/sdlc/spec.md`. $ARGUMENTS

Apply every relevant skill in `.claude/skills/` (and any extension in `.ai/skills/`) and flag
what they raise as `> **CONCERN (<skill>):**` blocks inline. Do not resolve a concern by
narrowing the spec.

When the draft is written, run the `spec-reviewer` subagent against it and show me its
verdict before we go further. Revise on **Blocking** items; bring **Worth fixing** items
to me as a short list rather than acting on all of them.

Commit as `docs: spec for <slug>` once I accept it; the spec reaches `develop` through a PR.
