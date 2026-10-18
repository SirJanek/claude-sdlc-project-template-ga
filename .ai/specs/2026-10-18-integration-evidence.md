# Spec: Integration evidence in CI, cached agent-browser Chrome

**Intent:** [intent.md](../../docs/sdlc/intent.md) › Constraints (AI-native SDLC process) — enabling work
**Builds on:** [2026-10-18-ci-safety-net.md](implemented/2026-10-18-ci-safety-net.md)
**Status:** accepted · requested by Jan on 2026-10-18 ("evidence in checks like the course; then the add-ons")

## Scope

**In:** integration tests save evidence (screenshots of every browser step, a screenshot of the
page when a test fails, logs of the migrations, build and both servers, JUnit and JSON results);
CI uploads it as an artifact **even when tests fail** and writes a results table to the job
summary; agent-browser Chrome cached between runs; GitHub Actions bumped to current majors;
the CI safety-net spec moved to `implemented/`.

**Out:** visual regression comparison; video recording.

## Acceptance criteria

1. Given `make test-integration`, then `tests/integration/.evidence/` contains a PNG per browser
   step, `junit.xml`, `results.json` and logs of migrate, build, the dev server and the production
   server; the folder is git-ignored.
2. Given a failing browser test, then a `FAILED-<test>.png` screenshot of the page at the moment of
   failure is saved.
3. Given a CI run, then the Integration job uploads the evidence folder as artifact
   `integration-evidence-<run id>` with `if: always()`, and the job summary shows a table of
   integration results (passed / failed / skipped per test file).
4. Given a second CI run with the same agent-browser version, then Chrome is restored from the cache
   (`~/.agent-browser`) instead of downloaded.
5. Given the workflow, then it uses current action majors (checkout v7, setup-node v7,
   upload-artifact v7, cache v6, pnpm/action-setup v6) and stays green.

## Implementation plan

**Accepted:** 2026-10-18 by Jan

| Phase | What | Done when |
|---|---|---|
| 1 Evidence in tests | evidence dir, step and failure screenshots, server/build/migrate logs, JUnit + JSON reporters | AC 1–2 locally |
| 2 CI | upload-artifact (always), job summary, Chrome cache, action bumps, spec move | AC 3–5 on the PR's CI run |

### Progress

| Phase | Status | Evidence |
|---|---|---|
| 1 Evidence in tests | ✅ done | 12/12 locally; evidence: 4 step screenshots, migrate/build/server-dev/server-prod logs, junit.xml, results.json; broken page → `app-FAILED-shows-the-empty-state-….png`, clean rerun leaves no FAILED file |
| 2 CI | ⏳ | |
