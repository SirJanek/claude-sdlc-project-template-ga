---
description: Stage 3 — build an interrogated implementation plan for a spec in .ai/specs/ and commit it
argument-hint: [spec slug, optional: constraint or area to focus on]
---

**Enter plan mode (Shift+Tab) before running this** so you cannot edit files until I accept.

Read the spec `.ai/specs/YYYY-MM-DD-<slug>.md` named in $ARGUMENTS (otherwise the one this
branch or PR belongs to; if several open specs could match, ask me). $ARGUMENTS

Before planning, read the files you will actually change. Do not plan against guesses about
what the code looks like.

Produce a plan listing, in order:

- every file touched and why
- the test added or changed for each acceptance criterion
- the sequence of commits
- anything in the spec you cannot implement as written

Then interrogate your own plan and answer in it: what is the riskiest assumption here, what
breaks if it is wrong, and what is the cheapest way to find out before writing code?

When I accept, append it to the same spec file as a `## Implementation plan` section, in the
format of `docs/sdlc/plan.md`, and commit it **before** touching any other file.
