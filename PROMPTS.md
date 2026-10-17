# Prompty — MentorHub

Prompty do **skopiowania ręcznie**. Skille (`.claude/skills/`) odpalają się same po triggerze,
komendy (`/sdlc-*`) są skrótem na typowy przebieg — te tutaj są do sytuacji, gdy chcesz
poprowadzić rozmowę sam. Treść po angielsku, bo tak działają najpewniej.

---

## 1. Plan — wyciągnięcie problemu z głowy do `intent.md`

Odpal to, zanim ktokolwiek napisze słowo „wymagania". Rozmowa ma boleć — jeśli Claude nie
zadał Ci pytania, na które nie znasz odpowiedzi, nie dowiedziałeś się niczego.

```
I want to capture a problem as an intent.md, not a solution.

The problem: <2-4 sentences, as messy as it actually is>

Interview me. Ask one question at a time, and ask about what I have not said:
who is actually blocked by this, what they do today instead, what happens if we
do nothing, what constraint I am treating as fixed that is not.

Do not propose a solution and do not write the file until I say "write it".
When I do, write docs/sdlc/intent.md with: Problem, Desired outcome,
Affected users, Constraints, Open questions, Out of scope.
Anything I was vague about goes under Open questions verbatim — do not resolve it for me.
```

## 2. Design — `intent.md` → `spec.md`

Jedna sesja. Jeśli zajmuje więcej niż jedną, `intent.md` był za słaby — wróć do kroku 1.

```
Read docs/sdlc/intent.md and turn it into docs/sdlc/spec.md.

Apply every skill in .claude/skills/ that is relevant (security, compliance, UX,
brand) and flag each concern inline as > **CONCERN (<skill>):** <what and why>.
Do not silently resolve a concern — surface it.

spec.md must contain: Scope (in / out), Acceptance criteria as a numbered list where
each one is independently testable, Interfaces touched, Data and migrations,
Non-functional requirements with numbers, Risks, Open questions carried over from intent.md.

If an acceptance criterion cannot be stated as a test, say so instead of writing it.
```

## 3. Build — tryb plan, commit `plan.md`

Wejdź w tryb plan (Shift+Tab) i dopiero wtedy to wklej. Claude nie dotknie plików, dopóki
nie zaakceptujesz planu.

```
Read docs/sdlc/spec.md and produce an implementation plan.

Before planning, read the files you will actually change — do not plan against guesses.

The plan must list, in order: every file touched and why, the test added or changed for
each acceptance criterion, the order of commits, and anything in spec.md you cannot
implement as written.

Then interrogate your own plan: what is the riskiest assumption, what breaks if it is
wrong, and what is the cheapest way to find out before writing code? Answer that in the plan.

When I accept it, write it to docs/sdlc/plan.md and commit it before editing anything else.
```

## 4. Test — naprawa buga przez TDD

Kolejność jest nieprzypadkowa. Test commitowany osobno **przed** poprawką jest dowodem,
że bug istniał; hook `no-test-edits.sh` pilnuje, żebyś go potem nie „naprawił".

```
Bug: <what happens> / Expected: <what should happen> / Repro: <steps or input>

Step 1: write a single failing test that reproduces this. Run it, paste the failure
output, and commit the test alone with message "test: reproduce <bug>". Stop there.

Step 2 (after I confirm): make the test pass. You may not edit any file under tests/.
If the test is wrong, tell me — do not change it.

Step 3: run `make check` and paste the full output. Done means verified, not asserted.
```

## 5. Test — nowe zadanie ewaluacyjne z incydentu

Każdy incydent produkcyjny zostaje evalem. Inaczej ta sama regresja wraca.

```
Read docs/sdlc/LESSONS.md entry for <incident>. Turn it into an eval task under
evals/tasks/<slug>.md following the format of the existing tasks there.

The acceptance check must be a command that exits non-zero if the regression returns.
Prefer asserting on behaviour over asserting on implementation.
```

## 6. Deploy — review przed podniesieniem PR

```
Review the staged diff against REVIEW.md. Run every pass in order.

Judge the diff against docs/sdlc/spec.md and docs/sdlc/plan.md, not against what you
would have built. Anything the diff does that the plan did not ask for is a finding.

Report Important findings first, then at most 3 nits. For each: file:line, the defect in
one sentence, and a concrete failure scenario. If you cannot name the scenario, drop it.
```

## 7. Maintain — sygnał z produkcji z powrotem na początek pętli

Tryb read-only. Przy 2σ diagnoza, przy 3σ dopiero PR — progi w `docs/sdlc/bands.yaml`.

```
Signal: <metric> crossed <band> — <value> vs baseline <baseline>, since <when>.

Diagnose only. Do not edit files and do not open a PR.

Correlate against recent merges, config changes, and deploys in that window. Give me:
the three most likely causes ranked by evidence, what observation would separate them,
and the cheapest safe mitigation.

Then write docs/sdlc/intent.md for the underlying problem — not for the symptom.
The loop restarts there.
```

---

## Zasady, które trzymają to w kupie

- **Nie przeskakuj artefaktu.** Jeśli nie ma `spec.md`, nie ma czego planować. Brakujący
  artefakt to sygnał, że decyzja nie zapadła, a nie że da się ją pominąć.
- **Robi się to samo drugi raz → do `CLAUDE.md`.** Trzeci raz → do hooka.
- **„Done" znaczy zweryfikowane.** Wklejony output `make check`, nie zdanie „powinno działać".
- **Skill doradza, hook blokuje.** Polityka bez hooka albo checku na PR jest sugestią.
