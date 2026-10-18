# Code review rules — MentorHub

Applied by `om-code-review` (and therefore `om-auto-review-pr` and `om-review-prs`) and by human
reviewers. Derived from this repository: a pnpm monorepo (`packages/{app,core,db,ui}`) with
Next.js App Router, MikroORM on PostgreSQL, an Awilix container, Zod, shadcn/ui, Vitest at 100%
coverage and integration tests on testcontainers + agent-browser. Engineering rules live in
`AGENTS.md` and `.ai/docs/engineering-standards.md`; this file says what a review checks and how
loudly. `REVIEW.md` keeps the same policy for the (disabled) GitHub Claude review workflow.

## Review priorities (in order)

Stop reporting a finding once an earlier pass reported it.

1. **Correctness** — does the diff do what the spec's `## Implementation plan`
   (`.ai/specs/YYYY-MM-DD-<slug>.md`) says? Null/empty handling, error paths that swallow
   failures, money rounding, time zones and notice windows, irreversible migrations.
2. **Security** — authorization on every new route, unvalidated input, CSRF, secrets or PII in
   code, logs or fixtures, new dependencies.
3. **Contracts** — anything listed in `BACKWARD_COMPATIBILITY.md` changed without the required
   path (migration note, all consumers updated in the same PR).
4. **Spec compliance** — every acceptance criterion satisfied; anything the spec did not ask for
   is scope creep and a finding, not a bonus.
5. **Tests** — each behaviour change covered; a bug fix has a test that fails without the fix.

## Repo-specific checks

**Architecture and boundaries**
- Dependency direction is `app → core → db`; `ui` is imported by `app` only. ESLint enforces
  `no-restricted-imports`, so a boundary finding usually means a new deep or relative import
  that slipped past it.
- Domain logic lives in `packages/core` services (classes registered in
  `core/src/container/cradle.ts`, resolved per request scope). Logic in a route file, a page, or
  a React component is a finding: route files are configuration (`makeCrudRoute`, `apiHandler`).
- Business parameters (prices, fees, notice and cancellation windows) come from `RULES` in
  `core/src/config/rules.ts` — a literal duplicating one of them elsewhere is a finding.

**HTTP layer**
- Every handler goes through `apiHandler` (envelope `{ ok, data | error }`, CSRF header
  `x-mentorhub-request` on state-changing methods, `AppError` → status, unknown → logged 500).
  Returning a raw `Response` is allowed only for a documented non-envelope contract such as
  `/api/health`.
- Input is parsed with a Zod schema before it reaches a service; no `as` casts on request data.
- Routes are guarded by `requireSession` / `requireRole` by default; `authorize: 'public'` needs a
  spec that says the route is public. The dev-admin session (`ALLOW_DEV_ADMIN=1`) must stay
  limited to `NODE_ENV === 'development'` — any widening is **Important**.
- The client calls the API only through `ui/src/backend/api/apiCall.ts`; raw `fetch` elsewhere is
  a finding (also blocked by ESLint).

**Data**
- Entities use MikroORM `defineEntity` + `setClass` in `packages/db/src/entities/<concept>/`.
- Every schema change ships a migration created with `make db-migration NAME=…` and
  **hand-reviewed**: the generator turns renames into drop + create, which loses data.
  Applied migrations are never edited.
- No queries in `app`; data access goes through services in `core`.

**UI**
- shadcn/ui primitives come from the CLI into `packages/ui/src/components/ui/`; hand-written
  copies or edits to generated primitives are findings. Shared form/table/feedback pieces live in
  `ui/src/backend/`.
- User-facing text is English; error text is linked with `aria-describedby`, not placed inside
  `<label>`.
- A user-facing change states its empty, loading, error and no-permission behaviour.

**Tests and evidence**
- Unit coverage stays at 100% (lines, branches, functions, statements); new exclusions beyond
  tests, configs and `packages/db/src/scripts/**` are findings.
- A new route, page or migration has an integration test in `tests/integration/` that drives the
  real app (agent-browser) or the real database (testcontainers), with screenshots in evidence.
- A test edited in the same commit as the fix it validates is a finding.

**Hygiene**
- No `any`, `console`, empty `catch`, or disabled lint rules without a reason in the same line.
- Logging uses the pino logger; new fields that may carry PII are added to `REDACTED_PATHS`.
- Changes to `.github/workflows/`, `.claude/hooks/`, `.claude/settings.json`,
  `docs/sdlc/LESSONS.md` or `docs/sdlc/bands.yaml` need an explicit reason in the PR body
  (AGENTS.md hard rule) — otherwise **Important**.
- A run log in `.ai/runs/` exists for AI-authored work, and the spec moves to
  `.ai/specs/implemented/` when the work is done.

## Severity

Report as **Important** (blocks approval) only if at least one holds:

- it can produce wrong data, data loss, wrong money amounts, or an outage;
- it can be reached by untrusted input, or weakens authorization or CSRF;
- it breaks a contract in `BACKWARD_COMPATIBILITY.md` without the required path;
- it contradicts the spec or its implementation plan;
- it leaves a behaviour change untested or drops coverage below 100%.

Everything else is a **nit**. At most three nits per PR — pick the three that cost the reader
most. No findings about formatting or import order (`make lint` owns those), no praise, no
summary of the diff.

## Format

For each finding: `file:line`, one sentence stating the defect, then one concrete failure
scenario (inputs → wrong result). If you cannot name the scenario, it is not a finding. A failing
required check or a merge conflict is reported as a blocker together with the full review, not
instead of it (see `SDLC.md`).

## Closing the loop

When the same class of finding appears in three PRs, it becomes a line in `AGENTS.md` → *Things
agents get wrong*, or a lint rule / hook if it is non-negotiable.
