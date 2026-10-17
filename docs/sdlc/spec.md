<!--
STAGE 2 — Design. FORMAT TEMPLATE — do not fill it in here.
Each spec is a new file .ai/specs/YYYY-MM-DD-<slug>.md written with /sdlc-spec from the accepted
docs/sdlc/intent.md, reviewed by the spec-reviewer subagent, and merged through a PR. After
the change merges, the spec moves to .ai/specs/implemented/. Every acceptance criterion must
be independently testable. /sdlc-plan later appends a "## Implementation plan" section
(format: docs/sdlc/plan.md) to the same file.
-->

# Spec: <short name>

**Intent:** [intent.md](../../docs/sdlc/intent.md) · **Status:** draft | reviewed | accepted

## Scope

**In:** <what this change covers>

**Out:** <what it does not — the half that stops scope creep later>

## Acceptance criteria

<Numbered, independently testable. If one cannot be stated as a test, write what is
missing instead of writing a vaguer criterion.>

1. Given <state>, when <action>, then <observable result>.
2. …

## Interfaces touched

| Interface | Change | Breaking |
|---|---|---|
| <endpoint / schema / event / CLI> | added \| changed \| removed | yes \| no |

## Data and migrations

<What changes shape. Whether the migration reverses, and how it was rehearsed.>

## Non-functional requirements

<With numbers. "Fast" is not a requirement.>

| Property | Target |
|---|---|
| Latency (p95) | <ms> |
| Throughput | <rps> |
| Availability | <%> |
| Retention | <period> |

## Risks

<What could make this the wrong solution, not just a buggy one.>

## Concerns raised

<One block per skill that flagged something. Leave them unresolved until a human decides —
do not narrow the scope to make a concern disappear.>

> **CONCERN (security):** <what and why> — needs a decision before build.

## Open questions

<Carried from intent.md, plus anything new.>

- [ ] <question> — who can answer it
