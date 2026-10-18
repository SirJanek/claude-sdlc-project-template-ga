# Review policy — MentorHub

Read by the PR review agent (`.github/workflows/claude-review.yml`) and by `/code-review`.
Humans still approve through branch protection; this file decides what the agent says first.
The full repo-specific checklist used by the Open Mercato review skills is [`CODE_REVIEW.md`](CODE_REVIEW.md).

## Passes

Run in order. Stop reporting a finding once it has been reported by an earlier pass.

1. **Correctness** — does the diff do what the spec's `## Implementation plan` (`.ai/specs/YYYY-MM-DD-<slug>.md`) says it does? Off-by-one,
   null/empty handling, error paths that swallow failures, concurrency on shared state,
   migrations that are not reversible.
2. **Security** — injection through unvalidated input, authz checks missing on a new route,
   secrets or tokens in the diff, new dependency with no pinned version, logging of PII.
3. **Spec compliance** — does the diff satisfy every acceptance criterion in
   the spec in `.ai/specs/`, and does it do anything the spec did not ask for? Scope creep is a
   finding, not a bonus.
4. **Tests** — is each behaviour change covered? For a bug fix, is there a test that fails
   without the fix? A test edited in the same commit as the fix it validates is a finding.

## What counts as Important

Report as **Important** only if at least one holds:

- It can produce wrong data, data loss, or an outage.
- It can be reached by an untrusted input.
- It contradicts the spec or its implementation plan.
- It leaves a behaviour change untested.

Everything else is a nit.

## Caps

- **Maximum 3 nits per PR.** If there are more, pick the three that cost the reader most
  and drop the rest. A review nobody finishes is a review that did not happen.
- No findings about formatting, import order, or anything `make lint` already enforces.
- No praise, no summary of what the diff does — the author wrote it.

## Format

For each finding: `file:line`, one sentence stating the defect, then one concrete failure
scenario (inputs → wrong result). No "consider", no "might want to". If you cannot name
the scenario, it is not a finding.

## Closing the loop

When the same class of finding appears in three PRs, it stops being a review item and
becomes either:

- a line in **`AGENTS.md` → Things agents get wrong** (or **`CLAUDE.md` → Things Claude gets wrong** if Claude-only), or
- a **hook** / lint rule, if it is non-negotiable.

Reviews that keep catching the same thing mean the guardrail is in the wrong place.
