# Evals — MentorHub

Zmiana `AGENTS.md`, `CLAUDE.md`, skilla albo hooka jest zmianą zachowania systemu. Testujemy ją tak
samo jak zmianę kodu — inaczej przez miesiąc nikt nie zauważy, że agent zaczął pisać
gorzej, bo ktoś skrócił jedną sekcję.

## Co tu trzymamy

**20–50 prawdziwych zadań** z tego projektu — takich, które ktoś faktycznie zlecał Claude.
Nie wymyślonych. Każde ma komendę sprawdzającą, która zwraca kod ≠ 0, gdy wynik jest zły.

Dwa źródła zadań, oba lepsze niż wyobraźnia:

- **`AGENTS.md` → Things agents get wrong** i **`CLAUDE.md` → Things Claude gets wrong** — każdy wpis to zadanie, które kiedyś poszło źle.
- **Każdy incydent produkcyjny.** Z `docs/sdlc/LESSONS.md` prosto tutaj. Incydent bez evala
  wróci.

## Uruchomienie

```bash
./evals/run-evals.sh              # wszystkie
./evals/run-evals.sh add-endpoint # jedno, po nazwie pliku
```

Wymaga Claude Code w trybie nieinteraktywnym (`claude -p`) i czystego drzewa roboczego —
skrypt odmówi startu na niezacommitowanych zmianach, bo każde zadanie pracuje na kopii.

W CI: `.github/workflows/claude-evals.yml`, odpalane przy zmianie `AGENTS.md`, `CLAUDE.md`, `.claude/**`,
`Makefile` lub `evals/**` oraz nocnie. Dopóki `Makefile` zawiera zaślepki, job **pomija się
i kończy na zielono** — świeży szablon nie ma czego ewaluować, a stale czerwone CI uczy
zespół ignorować czerwone. Uzupełnienie `make install` / `make test` włącza evale samo,
bez dotykania workflow.

## Format zadania

`evals/tasks/<slug>.md`:

```markdown
---
name: add-endpoint
check: make test && test -f src/api/health.py
timeout: 600
---

Add a GET /health endpoint that returns {"status": "ok"} and a test for it.
```

- **`check`** — shell, uruchamiany po zakończeniu sesji. Kod ≠ 0 = fail.
- **`timeout`** — sekundy, domyślnie 600.
- **Ciało** — prompt podawany Claude dosłownie.

## Jak pisać `check`

Sprawdzaj **zachowanie**, nie implementację. `test -f jakiś/plik.py` przechodzi, gdy agent
stworzył pusty plik o właściwej nazwie — i nie powie Ci nic o tym, czy endpoint działa.
Lepszy check uruchamia to, co powstało, i patrzy na wynik.

Dobry check jest też **deterministyczny**: ten sam kod źródłowy daje ten sam wynik przy
każdym przebiegu. Flaky eval jest gorszy niż brak evala, bo uczy zespół ignorować czerwone.

## Co z wynikami

Spadek pass rate po zmianie `AGENTS.md`, `CLAUDE.md` albo skilla to regresja — cofnij albo napraw, tak
samo jak przy czerwonym teście. Pass rate trzymamy w `docs/sdlc/00-OVERVIEW.md` jako
metrykę etapu Test.
