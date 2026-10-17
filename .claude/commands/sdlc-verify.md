---
description: Stage 4 — independently verify the current change against its spec and implementation plan
---

Run the `verifier` subagent against the current working tree.

It runs the build, the tests and the app, exercises each acceptance criterion in the spec
for this change (`.ai/specs/YYYY-MM-DD-<slug>.md`), and reports what it observed. It does not
fix anything — that is deliberate, so its verdict is independent of whoever wrote the code.

Show me its report unedited, including the raw command output it quotes.

If the verdict is `FAIL` or `BLOCKED`, deal with the findings before we go near a PR, and
re-run this command afterwards rather than assuming the fix worked.
