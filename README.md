# MentorHub

Marketplace **mentoringu 1:1 przez wideo**: osoby rozwijające karierę w produkcie, inżynierii, AI i UX rezerwują sesje z praktykami, którzy „już to zrobili”. Projekt kursowy programu **AI Tech Leaders** (12.10–13.11.2026), prowadzony według AI-native SDLC.

> [!NOTE]
> **Status (2026-10-17):** discovery zakończone, [`intent.md`](docs/sdlc/intent.md) w wersji **draft** czeka na akceptację product ownera. Stack i kod produktu jeszcze nie istnieją, a `Makefile` ma celowo zaślepki kończące się błędem.

## Od czego zacząć

| Chcę… | Otwórz |
|---|---|
| Zrozumieć produkt w 5 minut | [docs/discovery/README.md](docs/discovery/README.md) |
| Przeklikać prototyp | `docs/discovery/mockups/index.html` (dwuklik, bez serwera) |
| Zobaczyć, kto korzysta i po co | [01 · Użytkownicy i potrzeby](docs/discovery/01-Uzytkownicy-i-potrzeby.md) |
| Zobaczyć przepływy i reguły biznesowe | [02 · Use case'y i przepływy](docs/discovery/02-Use-case-i-przeplywy.md) |
| Zobaczyć ekrany | [03 · Mapa ekranów](docs/discovery/03-Mapa-ekranow-i-nawigacja.md), [04 · Specyfikacja ekranów](docs/discovery/04-Specyfikacja-ekranow.md) |
| Zobaczyć proponowane API | [05 · Katalog API](docs/discovery/05-Katalog-API.md) |
| Wiedzieć, jak pracujemy | [docs/sdlc/00-OVERVIEW.md](docs/sdlc/00-OVERVIEW.md) |

## Jak pracujemy

Każdy etap zostawia w repo plik czytany przez następny, a historia commitów jest audit trailem:

```
discovery  →  intent.md  →  spec.md  →  plan.md  →  diff + testy  →  PR z review  →  incydent
 propozycja    problem      wymagania    plan        implementacja    wdrożenie      produkcja
```

1. **Discovery** (`docs/discovery/`): analiza i prototyp. To propozycja, a nie wymagania.
2. **Plan:** [`docs/sdlc/intent.md`](docs/sdlc/intent.md) (`/sdlc-intent`). Akceptuje i commituje product owner.
3. **Design:** `docs/sdlc/spec.md` (`/sdlc-spec`, potem subagent `spec-reviewer`). Kryteria akceptacji, każde testowalne osobno.
4. **Build:** `docs/sdlc/plan.md` (`/sdlc-plan` w trybie plan), commitowany przed kodem.
5. **Test i Deploy:** `make check` z wklejonym outputem, PR do `develop` z review według [REVIEW.md](REVIEW.md).

Szczegóły i metryki etapów: [docs/sdlc/00-OVERVIEW.md](docs/sdlc/00-OVERVIEW.md). Gotowe prompty: [PROMPTS.md](PROMPTS.md).

## Konwencje

- **UI aplikacji po angielsku**; dokumentacja dla ludzi po polsku; pliki czytane przez agentów (`AGENTS.md`, `CLAUDE.md`, skille, hooki, artefakty `docs/sdlc/`) po angielsku.
- Gałęzie od `develop`, zmiany przez PR. Commity w trybie rozkazującym, z odwołaniem do nagłówka `intent.md`, któremu służą.
- „Done” znaczy zweryfikowane: wklejony output `make check`, nie deklaracja.
- Preply.com jest wyłącznie benchmarkiem funkcjonalnym i UX. Nie kopiujemy identyfikacji wizualnej, treści ani kodu.

## Struktura repo

| Ścieżka | Do czego |
|---|---|
| `.ai/` | Przestrzeń agentów: `specs/` (specyfikacje SDD `YYYY-MM-DD-slug.md`, `implemented/`, `archive/`), `runs/` (log każdego przebiegu AI: decyzje z uzasadnieniem, handoff), `lessons.md` + `lessons/` (wnioski zapisywane przez agentów), `skills/` (rozszerzenia i nadpisania skilli), `analyses/README.md` (indeks analiz trzymanych w `docs/`) |
| `docs/discovery/` | Analiza wstępna i klikalny prototyp (materiał wejściowy) |
| `docs/sdlc/` | Artefakty SDLC: `intent.md`, `spec.md`, `plan.md`, `LESSONS.md`, `bands.yaml` |
| `src/`, `tests/` | Kod produktu i testy (po wyborze stacku) |
| `AGENTS.md` | Pamięć projektu dla wszystkich agentów (Codex, Claude Code): komendy, konwencje, architektura, twarde reguły |
| `CLAUDE.md` | Import `@AGENTS.md` + specyfika Claude Code (tryb plan, komendy `/sdlc-*`, hooki) |
| `.claude/` | Komendy `/sdlc-*`, skille, subagenty, hooki strażników |
| `evals/`, `.github/workflows/` | Evale guardraili i review PR w CI |

## Pochodzenie

Repo powstało z szablonu [claude-sdlc-project-template-ga](https://github.com/PUCHAJDA/claude-sdlc-project-template-ga) (AI-native SDLC według [playbooka Anthropic](https://claude.com/resources/articles/the-ai-native-sdlc-playbook)). Instrukcja szablonu, w tym podpinanie `Makefile` i kolejność włączania guardraili, jest w README tamtego repo.
