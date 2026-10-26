# Track — E01 Phase 4: mentee return-to-slot (#27)

Spec: `.ai/specs/2026-10-18-accounts-and-roles.md` § Phase 4
Branch: `feat/e01-phase4-mentee-return` (od `develop` `09c7e43`)
PR label: `risk-high` (drugi recenzent w Codexie przed scaleniem)

Fazy 1–3 (spec): ✅ zrobione, w `develop`.

## Faza 4

- [ ] **T1** Walidacja `next` — helper i przekazanie przez oba przepływy (sign-in i GitHub). Test: otwarte przekierowania odrzucone.
- [ ] **T2** `requireVerified` — sesja bez zweryfikowanego maila dostaje `403 email_unverified`. Test wg AC2. Konsumowany przez E03. (AC3 przeniesione do E03-S01.)
- [ ] **T3** Test integracyjny — `?slot=` → logowanie → link z outboxa → powrót na dokładny adres z sesją zweryfikowaną (AC1).

## Ręczny test po fazie

Po T3: `make dev`, wejść na `/…?slot=…` bez sesji, zalogować się linkiem z outboxa maili, sprawdzić powrót na ten sam adres.
