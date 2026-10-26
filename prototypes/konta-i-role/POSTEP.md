# POSTEP — prototyp „konta-i-role” (Epik E01)

Stan: 2026-10-25 — **Etap 1, Etap 2 i Etap 3 zrobione.** Prototyp gotowy do przeglądu (krok zamykający: `prototype-feedback.md`).

## Gdzie co leży
- Źródła (nie commitować): `prototypes/konta-i-role/` — `index.html`, `vite.config.mjs`, `src/App.tsx` (ekrany, bramki, kontrolki), `src/data.ts` (konta demo, sloty, komunikaty), `src/main.tsx`, `src/styles.css`, `src/review/*` (silnik bez zmian, poza `prototypeId`), `evidence/` (zrzuty).
- Build: `cd packages/ui && npx --no-install vite build --config ../../prototypes/konta-i-role/vite.config.mjs` → `packages/ui/public/prototypes/konta-i-role/` (gitignored).
- Podgląd: http://localhost:6006/prototypes/konta-i-role/index.html
- Testy: skrypty Playwright poza repo (system Chrome z `--use-mock-keychain`); wyniki w tym pliku. README: `README.md` w tym folderze.

## Etap 1 — zrobione
- Ekrany s01, s03, s04, s05, s06, s08, s14; pasek przeglądu (lista ekranów, „Prototype”, motyw, tryby silnika).

## Etap 2 — zrobione (2026-10-25)
Ekrany s01–s14, konta demo z przełączaniem (T01), bramki dostępu (przekierowania z `next`, „Access denied”), kontrolki T01–T12 oraz L12 i L20 (decyzje A, dodane jako kontrolki). Wszystkie decyzje L01–L20 = A.

Wyniki (33 sprawdzenia):
- **PASS** S2-A: gość wybiera slot → logowanie linkiem → powrót do s12 z zaznaczonym slotem.
- **PASS** S2-B: niezweryfikowany mentee → s13 (alert) → link weryfikuje → s12 ze slotem.
- **PASS** S2-C: bramki — gość na s08 → s02 z `next`; mentee na s08 → s09; admin → s10; mentee na s10/s11 → Access denied; zalogowany mentor na s02 → s08 (L13).
- **PASS** S2-D1: błędy wysyłki 422 / 429 / 503 — komunikat, wpisany e-mail zostaje.
- **PASS** S2-D2: T02 ukrywa GitHub; L20 ukrywa formularz z tekstem „E-mail sign-in is coming soon.”
- **PASS** S2-D3: GitHub odmowa / e-mail niezweryfikowany / zły state → powrót na s02 z właściwym komunikatem.
- **PASS** S2-D4: GitHub sukces z logowania → zalogowany, s01.
- **PASS** S2-D5: GitHub timeout — 10 s odliczania, potem powrót z błędem.
- **PASS** S2-D6: GitHub z rejestracji mentora → s08 (L14: powrót na pochodzenie).
- **PASS** S2-E1: link wygasły → komunikat → „Request a new link” → s02 (link_invalid).
- **PASS** S2-E2: link zużyty między otwarciem a kliknięciem (410) → „already used”.
- **PASS** S2-E3: link na innym urządzeniu — stan i przycisk.
- **PASS** S2-E4: L17 — link przy innym zalogowanym koncie pyta „Continue as …?”.
- **PASS** S2-F1: T06 istniejący mentor → link rejestracji → s08 z notice, rola bez zmian (S01-AC3).
- **PASS** S2-G1: T07 wygasła / unieważniona sesja → s02 z „Your session ended — sign in again.”
- **PASS** S2-H1: T08 — odliczanie 60 s blokuje „Send a new link” z powodem; „ready” odblokowuje; wysłanie potwierdza.
- **PASS** S2-H2: L15 — /check-email bez adresu pokazuje tylko wyjście.
- **PASS** S2-I1: T09 invalid next — komunikat na s02; po logowaniu przekierowanie zablokowane (open-redirect).
- **PASS** S2-I2: T09 nieznany kod → komunikat ogólny.
- **PASS** S2-J1: T10 down / błąd API na s10 → alert + Retry → Connected.
- **PASS** S2-J2: T11 pusta / kilka / wiele wierszy; T10 błąd na s11 → Retry. (Tabela DS stronicuje co 20 wierszy — zgodnie z DS.)
- **PASS** S2-K1: T12 slot zajęty w czasie weryfikacji → „This time was just booked — pick another.”, slot znika z listy (L08 A).
- **PASS** S2-L1: L12 błąd wylogowania → inline alert + „Try again”.
- **PASS** S2-L2: L10 „Sign out everywhere…” → potwierdzenie → wylogowanie.
- **PASS** S2-M1: dev admin ma odznakę „Dev admin — local only”.
- Zrzuty stanów (`evidence/stage2-*`, `evidence/screen-*`).

Trzy pozycje z Etapu 2, które były nie sprawdzone, zamknięte w Etapie 3 (sekcja niżej). Prefetch skanera (niewidoczny z zewnątrz) nie jest do sprawdzenia i pozostaje poza zakresem.

## Etap 1 — luki domknięte
1. **PASS** Komentarze zapisują się: po wpisaniu uwagi w trybie Comment zapis trafia do localStorage (`om-prototype-comments:v2:konta-i-role`) i pinezka wraca po przeładowaniu (G1a).
   **PASS** „Export Markdown” pobiera `prototype-feedback.md` zaczynający się od `# Prototype feedback` i zawierający uwagę (G1b).
2. **PASS** Klawiatura: pełna ścieżka mentora wyłącznie Tab/Enter, s01 → s03 → s04 → s05 → s06 → s08 z zalogowaniem; każdy fokusowany element ma widoczny pierścień (`:focus-visible`); menu nagłówka otwiera się i zamyka klawiszem Enter/Escape (G2, 8/8 elementów z pierścieniem).
3. **FAIL → PASS** Kontrast etykiety „Prototype” w motywie ciemnym. Pierwsza wersja (wariant `warning`): **2,48:1** w ciemnym motywie (AA wymaga 4,5:1) — przyczyna: DS nie ma ciemnej wartości `--status-warning` (mostek mapuje tło na `--muted`). Zmieniono na wariant `neutral`: **13,88:1** w ciemnym, **8,28:1** w jasnym (G3). Wpis do DS: DS12.

## Etap 3 — zrobione (2026-10-25)
1. **Notatki przy ekranach s01–s14** — pod każdym ekranem: historie/decyzje, co jest symulowane, czego prototyp nie rozstrzyga (tabela `NOTES` w `src/data.ts`).
2. **README** — `prototypes/konta-i-role/README.md`: uruchomienie (Storybook 6006 + komenda buildu), konta demo, kontrolki T01–T12 (+ L12, L20), ekrany, sekcja **„Ograniczenia symulacji”** (GitHub i e-mail symulowane, brak danych kart i haseł, płatności poza zakresem, baza i użytkownicy to fixture, DS01–DS18 z jednym powodem każdy).
3. **Sprawdzenia w przeglądarce** (Playwright, system Chrome, `--use-mock-keychain`; skrypt poza repo):
   - **L1 PASS** — 320 px i 1440 px × jasny i ciemny × 14 ekranów (56 przebiegów): brak poziomego przewijania, wszystkie przyciski i kontrolki w obrębie ekranu.
     Poprawki w trakcie: szerokość selectów T01 (etykiety), nagłówek konta zawijany, kolumna ramki (`minmax(0,1fr)`), długi e-mail w nagłówku strony (DS18), tabela użytkowników w przewijanym kontenerze (DS17).
   - **B1 PASS** — klawiatura (Tab/Enter/Space) na pełnej ścieżce mentee: s12 → slot → s02 → GitHub → Anuluj → s02 → e-mail → s04 → s05 → s06 → s12 (slot zaznaczony); potem T01 Ola (type-ahead) → s12 → s13 → link → s04 → s05 → s06 → s12. Sprawdzone przy 1440 px.
   - **C1 PASS** — każdy włączony przycisk kliknięty co najmniej raz: 38 kliknięć (ekrany, pasek przeglądu, eksporty), bez błędów strony. Jeden wyłączony (s04 „Send a new link (60s)”) ma podpis na ekranie.
   - **C2 PASS** — każda opcja każdej kontrolki scenariuszy ustawiona: 48 opcji w 14 kontrolkach.
4. **Trzy niesprawdzone z Etapu 2 — zamknięte testem:**
   - **D1 PASS** — s05 „Requested by someone else”: tekst wyjaśnia, brak przycisku akcji.
   - **D2 PASS** — s04 resend przy 429 i 503: komunikat na s04, adres zostaje.
   - **D3 PASS** — s07 GitHub przy istniejącym e-mailu (F3): jedno konto (Tomasz), notatka „konto istnieje”, rola bez zmian.

**Błąd znaleziony i naprawiony przy okazji:** `ConfirmBlock` (s06) i `GitHubBlock` (s07) trzymały stan „Signing in…” / timeout między wizytami, więc przycisk zostawał wyłączony przy kolejnym wejściu. Naprawa: każda wizyta montuje blok od nowa (`key` z licznikiem wizyt).

**Regresja Etapu 2:** po zmianach 33/33 sprawdzeń nadal PASS.

**Serwowanie:** `http://localhost:6006/prototypes/konta-i-role/index.html` → 200, ścieżka ładuje się (po buildzie).

**Nie sprawdzone (zapisane wprost):**
- Kontrast mierzony tylko dla etykiety „Prototype”. Pozostałych ekranów w ciemnym motywie nie mierzono, a zrzutów nie oceniono wizualnie — są w `evidence/stage3/` do przeglądu.
- Klawiatura na pełnej ścieżce sprawdzona przy 1440 px, nie przy 320 px.
- Prefetch skanera linku (niewidoczny dla człowieka) — poza zakresem.

## Testy techniczne
- Brak nieobsłużonych błędów strony; konsola czysta (po dodaniu pustej ikony, która usuwa 404 `favicon.ico`).
- Poprzednio zmierzone: 320 px bez poziomego przewijania (Etap 1); w Etapie 2 nie powtarzane — do Etapu 3.

## Luki DS
Z Etapu 1 (w kodzie `LUKA DSxx`): DS01 (przycisk GitHub), DS02 (separator „or”), DS03 (odliczanie przy wysyłce — teraz używane), DS04 (szablon maila), DS06 (wspólna powłoka publiczna), DS08 (wzorzec „confirm”), DS11 (menu konta z drugą akcją i potwierdzeniem).
Nowe / zaktualizowane:
- DS05 „Access denied” (s09, s10, s11) — w DS brak wzorca odmowy; zbudowany z `Card` i `Button`.
- DS07 `ExistingAccountNotice` (s01, s08) używa palety `amber-*` (poza tokenami, L09) — użyty tak jak jest, do poprawy w DS.
- DS12 motyw ciemny: DS nie ma ciemnej wartości `--status-warning` (wariant `warning` Badge/Alert nieczytelny: 2,48:1). Motyw ciemny nie jest zdecydowany w DS.
- DS13 `SessionMenu` nie pokazuje stanu prototypu (pobiera `/api/auth/me`, brak propa z użytkownikiem) — nagłówek zrobiony z Button i DropdownMenu.
- DS14 klasy silnika `.btn`, `.segmented` i `.doc-toolbar` nie są w DS — zmapowane na tokeny w `src/styles.css`.
- DS15 (uwaga dla właściciela DS) Tailwind skanuje tekst `bg-[var(--dm-*)]` z dokumentacji i wypisuje ostrzeżenie w buildzie.
- DS16 (dla całości) wiersz kontrolek scenariuszy używa natywnych `<select>` — to narzędzie przeglądu, nie produkt; w DS nie ma wariantu do paneli testowych.

## Następny krok
Krok zamykający (czeka na „dalej”): przegląd przez prawdziwą osobę — przejście ścieżki, komentarze w trybie Comment, eksport „Export Markdown” (`prototype-feedback.md`) i przekazanie pliku z uwagami.
