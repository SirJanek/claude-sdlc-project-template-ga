# SDLC — MentorHub

Jak pracujemy. Sześć etapów, każdy zostawia artefakt, który czyta następny.
Historia commitów jest audit trailem — nie ma osobnego procesu „na zgodność".

```
Plan        Design      Build       Test        Deploy        Maintain
intent.md → .ai/specs/  → +plan     → diff+testy → PR z review → incydent
   ↑                                                             │
   └─────────────────────────────────────────────────────────────┘
```

Brakujący artefakt to nie formalność do nadrobienia — to sygnał, że decyzja nie zapadła.

---

## 1. Plan — `intent.md`

**Kto:** osoba zgłaszająca problem + product owner (akceptuje i commituje).
**Jak:** `/sdlc-intent` — Claude przesłuchuje, nie proponuje rozwiązań.
**Wynik:** problem, oczekiwany efekt, dotknięci użytkownicy, ograniczenia, pytania otwarte.

Pytania otwarte przechodzą dalej **nierozstrzygnięte**. Zgadnięta odpowiedź wygląda jak
postęp i jest defektem.

**Metryki:** czas do zacommitowanego `intent.md` · odsetek przyjętych do Design ·
liczba edycji po akceptacji (wysoka = przesłuchanie było za płytkie).

## 2. Design — `.ai/specs/YYYY-MM-DD-slug.md`

Każda zmiana ma własny plik specyfikacji w `.ai/specs/` (format: `docs/sdlc/spec.md`),
który trafia do `develop` przez PR, a po wdrożeniu przechodzi do `.ai/specs/implemented/`.

**Kto:** inżynier + skille organizacyjne (security, compliance, UX, brand).
**Jak:** `/sdlc-spec`. Jedna sesja. Potem subagent `spec-reviewer`.
**Wynik:** zakres, kryteria akceptacji (każde testowalne osobno), interfejsy, migracje,
wymagania niefunkcjonalne z liczbami, ryzyka.

Skill zgłasza zastrzeżenie jako `> **CONCERN (security):** …` — **nie** rozwiązuje go po
cichu zawężeniem zakresu. Od tego jest człowiek.

**Metryki:** czas `intent.md` → specyfikacja · liczba commitów do specyfikacji **po** dopisaniu
planu (to jest miara rework, najważniejsza liczba na tym etapie).

## 3. Build — sekcja „Implementation plan”

Plan dopisujemy do tego samego pliku specyfikacji jako `## Implementation plan` (format:
`docs/sdlc/plan.md`) i commitujemy przed kodem.

**Kto:** inżynier w trybie plan (Shift+Tab).
**Jak:** `/sdlc-plan`. Claude nie dotknie plików, dopóki plan nie zostanie przyjęty.
**Wynik:** pliki do zmiany, testy per kryterium, kolejność commitów, najbardziej ryzykowne
założenie i jak je tanio sprawdzić.

Pamięć projektu siedzi w `AGENTS.md` (wspólna dla wszystkich agentów, Claude Code wczytuje ją przez `CLAUDE.md`). Zasada: **ta sama poprawka drugi raz → do pliku.**
Trzeci raz → do hooka, bo widocznie nie wystarcza prośba.

**Tryb auto** (bez zatwierdzania każdej edycji) włączamy dopiero, gdy hooki i testy
działają — wtedy review przenosi się z pojedynczych edycji na artefakty. Równoległe sesje
przez worktree: `claude --worktree feature-x`. Zacznij od dwóch, nie od sześciu.

**Metryki:** first-pass merge rate · czas plan → merge · liczba cykli rework ·
równoległe sesje · zmiany zmergowane na inżyniera.

## 4. Test — diff + testy

**Kto:** inżynier + CI.
**Jak:** `/sdlc-verify` (subagent `verifier`), dla bugów skill `tdd-bugfix`.
**Wynik:** zielony `make check` z **wklejonym outputem**. „Powinno działać" nie jest wynikiem.

Dwie rzeczy, bez których ten etap nie działa:

- **Jedna komenda, kod wyjścia ≠ 0 przy błędzie.** Bez tego Claude nie ma pętli zwrotnej.
- **Każdy incydent produkcyjny zostaje evalem** w `evals/tasks/`. Inaczej regresja wraca.

Evale chodzą w CI na zmianę `AGENTS.md`, `CLAUDE.md` albo `.claude/**` — bo zmiana guardraila jest
zmianą zachowania systemu i wymaga testu tak samo jak zmiana kodu.

**Metryki:** first-pass CI success · czas review · change failure rate · pass rate evali ·
czas od incydentu do evala.

## 5. Deploy — PR z review

**Kto:** agent review + człowiek przez branch protection.
**Jak:** `.github/workflows/claude-review.yml` wg `REVIEW.md`. Komentarz `@claude` odpala poprawkę.
**Wynik:** PR z findingami ocenionymi wobec specyfikacji i jej planu implementacji.

Bramki (zatwierdzenie zmiany, autoryzacja release'u, ścieżki chronione) są **skryptami
hooków**, nie punktem w procedurze. `release-gate.sh` blokuje produkcję bez
`RELEASE_APPROVAL` — ten sam efekt co CAB, bez spotkania.

Stopniowana autonomia: dev swobodnie · staging logowany · produkcja z imiennym release
managerem. Rollback ćwiczymy na stagingu, zanim będzie potrzebny.

**Metryki:** czas do pierwszego review · odsetek uwag zamkniętych bez edycji człowieka ·
defekty, które uciekły · czas czekania na bramkach · DORA.

## 6. Maintain — incydent → `intent.md`

**Kto:** skrypt deterministyczny wykrywa, Claude diagnozuje, człowiek decyduje.
**Jak:** `/sdlc-incident`, progi w `bands.yaml`.
**Wynik:** wpis w `LESSONS.md`, nowy eval, nowy `intent.md`.

Progi: **1σ** log · **2σ** diagnoza read-only · **3σ** wolno PR albo runbook z listy.
Wykrywanie jest deterministyczne (reguły Western Electric na baseline kroczącym) —
Claude wchodzi dopiero do interpretacji, nie do decyzji „czy to anomalia".

**Metryki:** czas do diagnozy · odsetek incydentów z evalem · powtórki tej samej przyczyny.

---

## Cztery zasady, które to spinają

1. **Nie przeskakuj artefaktu.** Nie ma specyfikacji w `.ai/specs/` → nie ma czego planować.
2. **Skill doradza, hook blokuje.** Polityka bez hooka albo checku na PR jest sugestią.
3. **„Done" znaczy zweryfikowane** — wklejony output, nie deklaracja.
4. **Człowiek zostaje nad pętlą, nie w niej.** Osąd, nie klikanie zatwierdzeń.
