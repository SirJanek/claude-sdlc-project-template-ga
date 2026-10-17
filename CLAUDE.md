# MentorHub

<!--
Keep this file to ONE page. It is read on every turn — length costs attention, not just tokens.
THE RULE THAT MATTERS: when you correct Claude on the same thing twice, the correction
belongs here. That is what makes this file a memory instead of a README.
-->

1:1 video mentoring marketplace (mentees book vetted practitioners; intro session → weekly
plan on credits). Course project for AI Tech Leaders. Preply.com is a functional/UX benchmark
only — never copy its visual identity, copy or code.

## Commands

The stack is not chosen yet: every target below is a stub that exits 1 on purpose.
Wire them up in the first build plan; until then nothing counts as verified.

| Task | Command |
|---|---|
| Install | `make install` |
| Test | `make test` |
| Lint + format | `make lint` |
| Typecheck | `make typecheck` |
| Run locally | `make dev` |
| Full check (what CI runs) | `make check` |

## Conventions

- Source lives in `src/`, tests mirror it under `tests/`.
- Product UI text is English. Human-facing docs are Polish; files Claude reads
  (`CLAUDE.md`, skills, hooks, `docs/sdlc/*`) are English.
- Never edit files under `docs/sdlc/` without being asked — they are SDLC artifacts, not docs.
- `docs/discovery/` is input, not requirements. Its business rules, screens (IDs P*, M*, C*,
  T*, A*) and API catalogue are proposals until `docs/sdlc/spec.md` adopts them; when they
  disagree, `spec.md` wins. Reuse the screen IDs so artifacts stay traceable.
- `docs/discovery/mockups/` is a throwaway prototype (mock API in the browser). Do not import
  from it into `src/`, and do not treat its mock as a contract.
- Business parameters (prices, notice periods, fees) are configuration, never literals
  scattered through code.
- Branch from `develop`, merge via PR. Commit messages: imperative mood, reference the
  `intent.md` heading they serve.

## Architecture

- Planned, not built. Roles: guest, mentee, mentor, admin.
- Domains (from discovery): catalogue, booking & holds, payments & plans, sessions & video
  room, messaging, mentor onboarding, payouts, admin moderation & disputes.
- External systems (to be chosen in spec): payment provider (source of truth for charges and
  refunds), video provider (room tokens; join/leave logs are dispute evidence), email/push,
  KYC for mentors.
- Source of truth per artifact: requirements live in `docs/sdlc/`, tickets live in GitHub
  Issues. When these disagree, the repo wins for code and the tracker wins for scope.

## Things Claude gets wrong

<!--
Append-only. One line per mistake, phrased as the correction, not as a complaint.
Delete an entry only when the underlying cause is gone. Entries here are also the best
source of eval tasks — see evals/README.md.
-->

## Workflow

- Start in **plan mode** (Shift+Tab) with the relevant `docs/sdlc/spec.md`. Commit the
  accepted plan as `docs/sdlc/plan.md` before editing code.
- "Done" means verified: paste the output of `make check` as evidence, do not assert success.
- Bug fixes are TDD: failing test first, committed separately, then the fix. Do not edit
  the test to make it pass — a hook blocks that.
