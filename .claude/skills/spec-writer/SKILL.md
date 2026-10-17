---
name: spec-writer
description: Turn an accepted docs/sdlc/intent.md into a spec at .ai/specs/YYYY-MM-DD-slug.md with testable acceptance criteria, applying the org's security, compliance, UX and brand skills and flagging their concerns. Use when an intent.md exists and the work moves into design, or when asked to write requirements, a spec, or acceptance criteria. Do not use to write an implementation plan — that is plan mode and /sdlc-plan.
---

# Write the spec

Second stage. One session should be enough: `intent.md` in, a spec out — a new file
`.ai/specs/YYYY-MM-DD-<slug>.md` (date of creation, kebab-case slug, never renamed) using the
section format in `docs/sdlc/spec.md`. That template is a format, not a place to write. If it takes
more than one, the intent was too weak — say so and send it back rather than inventing
the missing decisions.

## Read first

1. `docs/sdlc/intent.md` — the problem you are solving.
2. Every other skill in `.claude/skills/` (plus extensions in `.ai/skills/`) that touches this change (security, compliance,
   UX, brand, domain rules). These constrain the spec; they are not optional reading.
3. The code that already exists in the area. A spec that ignores the current design
   produces a plan full of surprises.

## Flag, do not resolve

When a skill raises something the intent did not account for, write it inline:

> **CONCERN (security):** The spec adds an unauthenticated read endpoint. Policy requires
> authz on every route exposing customer records. Needs a decision before build.

Never silently satisfy a concern by narrowing the spec. The point of flagging is that a
human sees the trade-off.

## Sections

- **Scope** — in and out, explicitly. "Out" is the half that prevents scope creep later.
- **Acceptance criteria** — numbered, each independently testable. If you cannot state one
  as a test, write what is missing instead of writing a vaguer criterion.
- **Interfaces touched** — endpoints, schemas, events, CLI surface. Note breaking changes.
- **Data and migrations** — what changes shape, and whether the migration reverses.
- **Non-functional** — latency, throughput, availability, retention. With numbers; "fast"
  is not a requirement.
- **Risks** — what could make this the wrong solution, not just a buggy one.
- **Open questions** — carried from `intent.md`, plus anything new. Unresolved is fine.

## Hand off

Commit as `docs: spec for <slug>`; specs reach `develop` through a PR like code. When the
change merges, the spec moves to `.ai/specs/implemented/`.
Next step is plan mode with `/sdlc-plan`.

## Done means

Every acceptance criterion could be handed to someone who has not read `intent.md`, and
they would write the same test you would.
