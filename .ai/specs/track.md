# Track — E01 Phase 4: mentee return-to-slot (#27)

Spec: `.ai/specs/implemented/2026-10-18-accounts-and-roles.md` § Phase 4
Branch: `feat/e01-phase4-mentee-return` (od `develop` `09c7e43`)
PR label: `risk-high` (drugi recenzent w Codexie przed scaleniem)

Fazy 1–3 (spec): ✅ zrobione, w `develop`. Faza 4: ✅ zrobiona na PR #54 (czeka na scalenie; spec przenosimy do `implemented/` dopiero przy scalaniu).

## Faza 4

- [x] **T1** Walidacja `next` — helper i przekazanie przez oba przepływy (sign-in i GitHub). Test: otwarte przekierowania odrzucone. — commit `0b3eab2`
- [x] **T2** `requireVerified` — sesja bez zweryfikowanego maila dostaje `403 email_unverified`. Test wg AC2. Konsumowany przez E03. (AC3 przeniesione do E03-S01.) — commit `01eb1c5`
- [x] **T3** Test integracyjny — `?slot=` → logowanie → link z outboxa → powrót na dokładny adres z sesją zweryfikowaną (AC1). Przy okazji: strażnik `/mentor/profile` przekazywał stały ścieżkę i gubił query; teraz przekazuje ścieżkę z query. — commit `7074962`
- [x] **Review PR #54** Design tokens: 45 klas palety → tokeny semantyczne (`lint-tokens` 0). — commit `9cc078d`
- [x] **Review PR #54** Integration: 2 kolejne zielone przebiegi (57/57), flake nie odtworzony, bez zmian w teście. Log: `.ai/runs/2026-10-26-e01-phase4-mentee-return.md`

## Ręczny test po fazie

1. `make dev` (Postgres w Dockerze + Next na :3000). `MAIL_OUTBOX_FILE` musi wskazywać plik (absolutna ścieżka w `packages/app/.env.local`), bo link trafia tylko tam (adapter `mock`).
2. Okno prywatne przeglądarki (bez sesji) → `http://localhost:3000/mentor/profile?slot=2026-11-03T10%3A00&tz=Europe%2FWarsaw`.
   Oczekiwane: przekierowanie na `/sign-in?next=…`, a `next` zawiera ten sam `?slot=…&tz=…`.
3. Wpisz e-mail (np. `mentee@example.com`) → „Send me a sign-in link” → ekran „Check your inbox”.
4. W pliku outboxa znajdź ostatnią wiadomość dla tego adresu, skopiuj link `http://localhost:3000/auth/confirm?token=…`, otwórz go, naciśnij „Sign in as mentee@example.com”.
5. Oczekiwane: pasek adresu to dokładnie `http://localhost:3000/mentor/profile?slot=2026-11-03T10%3A00&tz=Europe%2FWarsaw`; strona pokazuje „Mentor account required” (poprawnie: konto to mentee, a strona sprawdza rolę mentora). `http://localhost:3000/api/auth/me` → `"emailVerified": true`.
6. Kontrola błędu: adres z `?slot=` w pasku po kroku 5 różniący się czymkolwiek (np. bez `tz`) oznacza regresję strażnika.
