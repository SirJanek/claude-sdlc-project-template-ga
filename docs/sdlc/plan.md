<!--
STAGE 3 — Build. FORMAT TEMPLATE for the "## Implementation plan" section that /sdlc-plan
appends to the spec file .ai/specs/YYYY-MM-DD-<slug>.md (plan mode, committed BEFORE any code
changes; headings below become level-3 inside that section). The spec plus this section is
what the PR review judges the diff against. Anything the diff does that this
plan does not describe is a review finding, however sensible it looks.
-->

# Plan: <short name>

**Accepted:** <YYYY-MM-DD> by <name>

## Files touched

| File | Change | Why |
|---|---|---|
| `src/...` | add \| modify \| delete | <one line> |

## Tests

<One row per acceptance criterion in the spec. A criterion with no test is a gap in the
spec, not a gap in the plan — go back and fix the spec.>

| Criterion | Test | New or changed |
|---|---|---|
| 1 | `tests/...::<name>` | new |

## Commit sequence

1. `test: <what it pins down>` — failing first where this is a fix
2. `feat: <what it does>`
3. …

## Riskiest assumption

**Assumption:** <the one that would hurt most if wrong>

**If it is wrong:** <what breaks, and how far the blast radius reaches>

**Cheapest way to find out first:** <the probe to run before writing the rest>

## Cannot implement as written

<Anything in the spec that does not survive contact with the code. Say so here rather than
quietly building something adjacent.>

## Out of scope for this plan

<Deliberately deferred. Links to a follow-up intent.md where one exists.>
