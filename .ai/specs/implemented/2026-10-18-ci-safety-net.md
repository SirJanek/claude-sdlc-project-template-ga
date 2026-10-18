# Spec: CI safety net — build, lint, unit tests at 100% coverage, ephemeral integration tests

**Intent:** [intent.md](../../../docs/sdlc/intent.md) › Constraints (AI-native SDLC process) — enabling work
**Standard:** [.ai/docs/engineering-standards.md](../../docs/engineering-standards.md) › Code Review Checklist, Correctness & tests
**Status:** accepted · requested by Jan on 2026-10-18 (prompt: CI for every PR — build, lint, unit tests, integration with testcontainers PostgreSQL + agent-browser; AGENTS.md rule of 100% unit coverage; cover existing code to 100%)

## Scope

**In:** GitHub Actions workflow running on every pull request (and pushes to `develop`); unit-test
framework (Vitest + v8 coverage, 100% thresholds) in all four packages, with jsdom + Testing
Library for React components; tests that bring existing code to 100%; integration suite that
starts an ephemeral PostgreSQL (testcontainers), applies migrations, starts the app and drives it
with agent-browser; Makefile targets; AGENTS.md rules.

**Out:** branch protection settings (repo admin action — proposed, not applied); visual
regression; load testing; deploy pipeline.

## Acceptance criteria

1. Given a pull request (or a push to `develop`), when CI runs, then separate checks run for
   **Lint**, **Typecheck**, **Unit tests (100% coverage)**, **Build**, **Integration
   (testcontainers + agent-browser)** and **Audit**; any failing step fails its check.
2. Given any package, when `make test` runs, then Vitest runs its unit tests with v8 coverage and
   fails if lines, branches, functions or statements are below **100%**.
3. Given the current code, then all four packages are at 100%; the only coverage exclusions are
   test files, config files and `packages/db/src/scripts/**` (thin CLI entry points whose logic
   lives in tested modules), each documented in AGENTS.md.
4. Given Docker, when `make test-integration` runs, then a fresh PostgreSQL container starts,
   migrations apply, the app starts twice (dev mode with the dev-admin flag; production build),
   tests drive it through agent-browser and HTTP, and afterwards no test container or browser
   session is left running.
5. Given the integration suite, then it verifies: landing page renders; `/admin` redirects to
   `/admin/users`; seeded users appear in the DataTable; empty state after deletion;
   `/api/users` envelope with the flag, 403 without the CSRF header on a write, **401 in
   production even with the flag**; `/api/health` 200 with the DB up and 503 / admin error state
   with the DB stopped; migrations up → down → up keep rows (separate container).
6. Given two runs in parallel (e.g. two agents on two worktrees), then they do not collide:
   each run gets its own container, free ports and agent-browser session.
7. Given AGENTS.md, then it states explicitly that every new feature or change ships with unit
   tests keeping coverage at 100%, plus an integration test for every new route, page or
   migration, and how to run both.
8. Given a deliberately broken change (drop a test → coverage < 100%; break a page → integration
   fails), then `make test` / `make test-integration` exit non-zero.

## Interfaces touched

| Interface | Change | Breaking |
|---|---|---|
| `.github/workflows/ci.yml` (protected path, approved by Jan) | added | no |
| `make test` (now with coverage thresholds), `make test-integration` | changed / added | no |
| `@mentorhub/db` migration CLI | logic moved to a tested module; entry stays thin | no |

## Non-functional requirements

| Property | Target |
|---|---|
| `make check` (warm) | under 3 minutes |
| `make test-integration` locally | under 3 minutes |
| CI wall clock per PR | under 10 minutes |

## Risks

- agent-browser / Chrome on GitHub runners — mitigated with `agent-browser install --with-deps`.
- Next.js dev server compile time makes the first page slow — generous waits in the harness.
- 100% coverage invites tests that assert nothing — tests must assert behaviour, checked by
  mutation of a few rules.

## Open questions

- [ ] Make the CI checks required via branch protection on `develop` — Jan (repo setting)

## Implementation plan

**Accepted:** 2026-10-18 by Jan

### Phases

| Phase | What | Done when |
|---|---|---|
| 1 Spec | this file, run log | committed before code |
| 2 Unit framework + 100% | coverage config per package, jsdom/Testing Library, tests for core, db, ui, app | AC 2, 3; `make check` green |
| 3 Integration | `tests/integration/` harness (testcontainers, migrations, dev + prod servers, agent-browser) and cases | AC 4–6; `make test-integration` green, no leftovers |
| 4 CI + rules | `.github/workflows/ci.yml`, Makefile, AGENTS.md/README, mutation checks, PR | AC 1, 7, 8; CI green on the PR |

### Riskiest assumption

**Assumption:** agent-browser + testcontainers run on GitHub-hosted Ubuntu runners without extra services.
**Cheapest probe:** the PR's own CI run of the Integration job.

### Progress

| Phase | Status | Evidence |
|---|---|---|
| 1 Spec | ✅ done | this commit |
| 2 Unit framework + 100% | ✅ done | `make check` exit 0 (15 s): 112 unit tests, 100% lines/branches/functions/statements in core, db, ui, app; mutation: two test files removed → `make test` exit 2 |
| 3 Integration | ✅ done | `pnpm test:integration` 12/12 in 16 s (testcontainers PostgreSQL, migrations, `next dev` + `next build`/`start`, agent-browser); no containers, servers or browser sessions left; mutation: broken empty state → exit 1; **found a real bug**: dev flag opened with NODE_ENV=test → flag now development-only |
| 4 CI + rules | ✅ done | PR #5 CI run 39084637168: Lint 28 s, Typecheck 32 s, Unit tests (100% coverage) 26 s, Build 32 s, **Integration (testcontainers + agent-browser) 63 s**, Audit 22 s — all green on GitHub-hosted Ubuntu; agent answers the testing rules from AGENTS.md |

**All phases complete.** Open: make the six checks required on `develop` (branch protection); the template's "Claude review" workflow needs the Claude GitHub App and an `ANTHROPIC_API_KEY` secret (fails today, not part of this spec).
