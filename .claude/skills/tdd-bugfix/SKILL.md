---
name: tdd-bugfix
description: Fix a reported bug test-first — write a failing test that reproduces it, commit the test alone, then make it pass without editing the test. Use whenever something is reported as broken, failing, wrong, crashing, regressed or returning unexpected output. Do not use for new features; use plan mode and spec-writer for those.
---

# Fix the bug test-first

A fix without a failing test first is a guess that happened to stop the symptom. The test
is what proves the bug existed and what stops it coming back.

## Step 1 — reproduce

Write **one** test that fails for the reported reason. Not a suite, not a refactor of the
existing tests.

Run it. Paste the actual failure output. If it passes, you have not reproduced the bug —
stop and say what you observed instead, because either the report or your understanding
of it is wrong, and both are worth knowing before you change code.

Commit the test alone:

```
test: reproduce <short description of bug>
```

The separate commit is the evidence. It shows the test failed before the fix existed.

## Step 2 — fix

Now change the implementation until the test passes.

**You may not edit any file under `tests/`.** The `no-test-edits` hook blocks it while
TDD mode is on. If the test is genuinely wrong — wrong expectation, wrong fixture, wrong
assumption about the API — stop and explain what is wrong with it. Do not work around it,
and do not weaken the assertion.

Fix the cause, not the symptom. If the null check you are adding is the third one on the
same path, the real defect is that the value can be null at all.

## Step 3 — verify

Run `make check` and paste the full output. "Done" means verified, not asserted.

Check that the fix did not break a sibling case: run the whole suite, not just the new test.

## Step 4 — close the loop

- Did the bug exist because of something a reviewer would call a known trap? Add a line to
  `AGENTS.md` → **Things agents get wrong** (`CLAUDE.md` → **Things Claude gets wrong** if Claude-only).
- Did it reach production? It becomes an eval task under `evals/tasks/` — see
  `evals/README.md`. Every production incident becomes an eval, or the regression returns.
