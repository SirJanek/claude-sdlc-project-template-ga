# Wnioski z lekcji 7 — prototyp E01 „Accounts and roles”

Data: 2026-10-26. Zakres: mapa ekranów, szary prototyp przepływu „mentor onboarding”, klikalny prototyp E01 (ścieżka mentora i mentee, odmowy, panel admina).

## Co powstało

- **Mapa ekranów** — `docs/discovery/mapa-ekranow-E01.md`: 14 ekranów, 72 stany, 12 przełączników scenariuszy, 20 luk w specyfikacji, 11 luk w design systemie. Wszystkie 20 luk rozstrzygnięte rekomendacją „A” (2026-10-24).
- **Szary prototyp** — `docs/discovery/mockups/discovery/mentor-onboarding/revision-001/`: przepływ, którego brief nie ma w Key flows (L01).
- **Klikalny prototyp** — `prototypes/konta-i-role/` (źródła, README z sekcją „Ograniczenia symulacji”, `POSTEP.md`). Build przechodzi do `packages/ui/public/prototypes/` i nie jest commitowany.

## Sprawdzenia w przeglądarce (agent, nie prawdziwa osoba)

- 33/33 w etapie 2 i 9/9 w etapie 3; regresja zielona.
- Układ 320 i 1440 px, jasny i ciemny motyw, 14 ekranów (56 przebiegów) — bez poziomego przewijania.
- Klawiatura: pełna ścieżka mentora (etap 1) i mentee (etap 3, przy 1440 px).
- Komentarze w trybie Comment: pinezki zostają po przeładowaniu; „Export Markdown” działa.

**Nie sprawdzono:** kontrast w ciemnym motywie poza etykietą „Prototype"; klawiatura przy 320 px; ocena wizualna zrzutów ciemnego motywu; test z prawdziwą osobą (krok zamykający lekcji — jeszcze nie zrobiony).

## Wnioski dla briefu i specyfikacji (do zatwierdzenia, jeszcze nie wprowadzone)

1. **Brief:** dodać przepływ „mentor onboarding” do Key flows (L01, wariant A). Zakres: zaproszenie → `/sign-up/mentor` → profil bez danych do wypłat → share link; publikacja slotów poza przepływem (E02).
2. **Specyfikacja E01:** dopisać treść maila z linkiem (L16), zasady dla konta bez imienia (L18: e-mail zamiast imienia), zachowanie przy zajętym slocie (L08: komunikat „pick another”, bez blokady), oraz ekran odmowy z kontaktem zamiast linku do zmiany roli (L06).
3. **Storybook E01:** usunąć wariant „Sign-up — e-mail taken” (DS10), bo zdradza, które maile są w bazie (sprzeczne z Q1 i S01-AC3). Usunąć osobny ekran „Mentee sign-up” (L02).
4. **Design system:** luki DS01–DS18 w `prototypes/konta-i-role/README.md`. Najważniejsze: przycisk GitHub i separator „or”, wzorzec „Access denied”, motyw ciemny (brak ciemnej wartości `status-warning`), `LoadingMessage` wycofany na rzecz `Skeleton`, menu konta z „Sign out everywhere”.
5. **Teksty w kodzie** sprzeczne z briefem (L19): „video sessions”, „intro at half price”, marka „MentorHub” zamiast DevMentor. Do poprawki przed E02.

## Co zostaje

- Przekazanie klikalnego prototypu prawdziwej osobie (krok zamykający): przejście, komentarze, `prototype-feedback.md`. Uwagi trafią do `docs/discovery/` i decyzji o briefie.
- Zatwierdzenie punktów 1–5 przez właściciela produktu, a dopiero potem zmiana briefu i specyfikacji (osobne PR-y).
- Zgłoszenia z przeglądów: #50 (przed lekcją 8), #51, #52 (bezpieczeństwo, priorytet).
