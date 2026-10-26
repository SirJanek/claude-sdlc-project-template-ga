# Prototyp: konta i role (DevMentor, Epik E01)

Klikalny prototyp przepływu z zatwierdzonej mapy ekranów (`lekcja-07/mapa-ekranow.md`, s01–s14). Pokazuje, jak konta, logowanie i role będą wyglądać i działać, zanim powstanie kod produkcyjny. Wszystkie dane są fikcyjne. Nic tu nie jest prawdziwą usługą.

## Jak uruchomić

1. Storybook na porcie 6006 (już działa, jeśli `packages/ui` jest uruchomione):
   ```
   cd packages/ui
   npx storybook dev --config-dir .storybook --port 6006 --no-open --ci --disable-telemetry
   ```
2. Podgląd prototypu: http://localhost:6006/prototypes/konta-i-role/index.html
3. Zbudowanie prototypu (wynik trafia do `packages/ui/public/prototypes/konta-i-role/`, folder jest w `.gitignore`; nie commitować):
   ```
   cd packages/ui
   npx --no-install vite build --config ../../prototypes/konta-i-role/vite.config.mjs
   ```

Źródła: `src/App.tsx` (ekrany, bramki dostępu, kontrolki), `src/data.ts` (konta, sloty, komunikaty, notatki do ekranów), `src/styles.css` (tokeny DS + mapowania), `src/review/` (silnik przeglądu z `lekcja-07/silnik-przegladu/`; w `comments.js` tylko `prototypeId`).

## Jak przeglądać

- Górny pasek: lista ekranów (s01–s14), oznaczenie „Prototype”, przełącznik motywu (jasny/ciemny) i tryby silnika: **Clickable** (klikanie), **Comment** (klik przypina komentarz do elementu), **Presentation** (jeden ekran), **Threads** (wątki, eksport), **Show/Hide hotspots**, **Hide/Show pins**.
- Drugi pasek: **kontrolki scenariuszy** T01–T12 (+ L12, L20). Zmieniają stan (konto, wynik GitHuba, błędy, link, sesję, bazę) bez przeładowania strony.
- Każdy ekran ma opis (`screen-meta`) i notatkę pod ramką (historie, symulacja, czego prototyp nie rozstrzyga).
- Klawiatura działa na całej ścieżce: Tab przechodzi po kontrolkach, Enter/Space je uruchamia. Zmiana ekranu przenosi fokus na nagłówek ekranu.
- Komentarze: tryb **Comment**, klik w element, wpisz uwagę. Zapisują się w przeglądarce (localStorage). Do zespołu:
  - **Export Markdown** → pobiera `prototype-feedback.md` (uwagi pogrupowane według ekranów). To jest plik do przekazania po przeglądzie.
  - **Export for repository** → pobiera `comments.js` do podmiany w `src/review/comments.js` i commita.

## Konta demo (T01)

Wszystkie e-maile są fikcyjne (`.test`). Nazwy nie są ustawione (`name` puste), więc wszędzie widać e-mail (L18 A).

| Konto (T01) | E-mail | Rola | Status | Do czego |
|---|---|---|---|---|
| Guest | — | — | brak sesji | start, ścieżka mentee z gościa |
| Kuba | `kuba.lis@example.test` | mentee | zweryfikowany | ścieżka S02-AC1 (slot → logowanie → powrót) |
| Ola | `ola.mazur@example.test` | mentee | **niezweryfikowana** | S02-AC2 (s13: alert, weryfikacja linkiem) |
| Piotr | `piotr.zajac@example.test` | mentee | zweryfikowany | „istniejący e-mail” jako mentee (T06) |
| Marta | `marta.kowalczyk@example.test` | mentor | zweryfikowana (GitHub `marta-k`) | s08, mentor landing |
| Tomasz | `tomasz.nowak@example.test` | mentor | zweryfikowany | S01-AC3 (ponowna rejestracja mentora) |
| Ewa | `ewa.ops@example.test` | admin | zweryfikowana | s10, s11 (operator = admin, L03) |
| Dev admin | (tylko lokalnie) | admin | odznaka „Dev admin — local only” | ALLOW_DEV_ADMIN |

Zmiana konta w T01 ustawia sesję bez wylogowywania przez formularz. Konto niezweryfikowane (Ola) pokazuje s13, dopóki nie zweryfikuje się linkiem.

## Kontrolki scenariuszy

| Kontrolka | Wartości | Co zmienia | Źródło |
|---|---|---|---|
| T01 Signed in as | guest / konta demo | zalogowane konto | F5, Q7, S02-AC2 |
| T02 GitHub | configured / not configured | pokazuje lub ukrywa przycisk GitHuba | Phase 2, Q11 |
| T03 GitHub result | success / denied / e-mail unverified / timeout 10 s / bad state | wynik na s07 (timeout odlicza 10 s naprawdę) | EC-gh-* |
| T04 Send result | sent / 422 / 429 / 503 | wynik wysyłki linku (s02, s03, s04, s13) | API contracts, EC-429, EC-mail-503 |
| T05 Link | valid / expired / used / 410 / other device | stan linku na s06 | F1, EC-link-expired |
| T06 E-mail exists | no / as mentee / as mentor | adres wysyłki to istniejące konto | S01-AC3, F3 |
| T07 Session | valid / expired / invalidated | stan sesji (wygasła → s02 z komunikatem) | F5, EC-role-change |
| T08 Resend clock | counting 60 s / ready | odliczanie przy „Send a new link” | spec › UI/UX |
| T09 next / code | none / valid next / invalid next (`//evil.com`) / unknown code | parametr wejścia na s02 | F4, EC-next-open-redirect |
| T10 Database | up / unreachable / API error | stan bazy na s10 i błąd listy na s11 | kod admin |
| T11 Users | empty / few / many (50) | zawartość listy s11 (DS tabela stronicuje co 20) | kod DataTable |
| T12 Slot on return | free / taken while verifying | czy slot jest wolny po powrocie | L08 A |
| L12 Sign-out | succeeds / fails | błąd wylogowania (inline alert + Try again) | L12 A |
| L20 Mail provider | on / off | ukrycie formularza e-mail („coming soon”) | L20 A |

L12 i L20 nie są w tabeli T01–T12 z zadania; dodano je, bo decyzje L12 i L20 (wariant A) wymagają stanu do pokazania.

## Ekrany

| ID | Ekran | Historie / decyzje |
|---|---|---|
| s01 | Home | F4, S01-AC3, L13, L18 |
| s02 | Sign in | F1, F2, F4, S02-AC1/AC2, L02, L20 |
| s03 | Mentor sign-up | S01-AC1/AC2/AC3, R15, L01, L14 |
| s04 | Check your inbox | F1, S02-AC1, L15, T08 |
| s05 | Sign-in e-mail (symulacja) | F1, L16 |
| s06 | Confirm sign-in | F1, S01-AC1, S02-AC1, L17 |
| s07 | GitHub (symulacja) | F2, F3, EC-gh-* |
| s08 | Mentor landing | S01-AC1/AC2/AC3, F5, L11 |
| s09 | Mentor account required | Phase 3, Q10, L06 |
| s10 | Admin · Dashboard | Q7, L03, L04 |
| s11 | Admin · Users | Phase 1, Q5, L18, L04 |
| s12 | Mentor page with slot (stub E02) | S02-AC1, F4, L07, L08 |
| s13 | Booking refused — verify e-mail | S02-AC2, L05 |
| s14 | Signed-in header | F5, L10, L12 |

Pełne notatki (historie, symulacja, czego nie rozstrzyga) są pod każdym ekranem w prototypie i w `src/data.ts` (`NOTES`).

## Ograniczenia symulacji

- **GitHub jest symulowany.** Strona s07 to makieta, a wynik ustawia T03. Nie łączy się z GitHubem ani z OAuth.
- **E-mail jest symulowany.** Skrzynka s05 zastępuje pocztę. Nie wysyła maili, a nadawca `no-reply@example.test` jest fikcyjny. Dostawca maili to osobna spec (Q3).
- **Brak prawdziwych danych kart i haseł.** Żaden formularz nie prosi o hasło ani o dane płatnicze. Jedyne pole to e-mail.
- **Płatności nie są w zakresie.** E01 nie ma ekranu płatności. Rezerwacja w s12 jest wyłączona z dopiskiem „E03, not in this prototype”.
- **Baza i użytkownicy to dane fikcyjne.** Lista s11 (T11) i stan bazy (T10) są fixture. „Many (50)” to 50 wierszy testowych, nie prawdziwi użytkownicy.
- **Zegar.** Dane (sloty 27–28 X 2026, Europe/Warsaw) są stałe. Odliczanie 60 s (T08) i limit GitHuba 10 s liczą się w czasie rzeczywistym.
- **Komponenty DS, których brakuje (zbudowane z tokenów, oznaczone `LUKA DSxx` w kodzie):**
  - DS01: przycisk „Continue with GitHub” nie ma wariantu OAuth w DS.
  - DS02: separator „or” nie jest komponentem w DS.
  - DS03: przycisk z odliczaniem wymaga powodu wyłączenia, a DS nie ma wzorca licznika.
  - DS04: DS nie ma szablonu e-maila transakcyjnego (s05 to symulacja).
  - DS05: DS nie ma wzorca „Access denied” (s09, s10, s11).
  - DS06: DS nie ma wspólnej powłoki stron publicznych; każdy ekran składa nagłówek sam.
  - DS07: `ExistingAccountNotice` używa palety `amber-*` zamiast tokenów (L09).
  - DS08: DS nie ma wzorca ekranu „confirm” (s06).
  - DS09: `LoadingMessage` jest wycofany; w prototypie użyto `Skeleton`.
  - DS10: story Storybooka E01 „e-mail taken” jest sprzeczne z Q1; nie ruszane, do poprawy przez właściciela DS.
  - DS11: menu konta z drugą akcją i potwierdzeniem nie ma w DS; zbudowane z DropdownMenu i AlertDialog.
  - DS12: motyw ciemny nie jest zdecydowany; `--status-warning` nie ma ciemnej wartości (wariant `warning` miał 2,48:1). Etykieta „Prototype” ma teraz wariant `neutral` (13,88:1 w ciemnym).
  - DS13: `SessionMenu` nie przyjmuje stanu użytkownika i pobiera `/api/auth/me`, więc nie pokaże stanu prototypu.
  - DS14: klasy silnika `.btn`, `.segmented`, `.doc-toolbar` nie są w DS; zmapowane w `src/styles.css`.
  - DS15: skan Tailwinda łapie tekst `bg-[var(--dm-*)]` z dokumentacji i wypisuje ostrzeżenie w buildzie.
  - DS16: kontrolki scenariuszy to natywne `<select>`, bo DS nie ma paneli testowych; to narzędzie przeglądu, nie produkt.
  - DS17: `DataTable` nie ma kontenera przewijania, więc na 320 px wychodzi poza ekran; prototyp opakowuje ją w `overflow-x-auto`.
  - DS18: `PageHeader` używa `break-words`, które nie łamie długiego e-maila w nagłówku; prototyp dodaje `overflow-wrap: anywhere` w ramce.
- **Nie zrobione przez prototyp (poza E01 lub do decyzji):** blokada slotu w czasie weryfikacji (PROPOSAL w Storybooku, nie w spec), strona mentora i profil (E02), rezerwacja i płatności (E03), limity ponownych wysyłek poza 429, kanał kontaktu z mentorem (do ustalenia przez Jana), wylogowanie z innych urządzeń naprawdę (prototyp tylko pokazuje akcję).
- **Kontrast.** Zmierzony tylko dla etykiety „Prototype” w obu motywach. Na pozostałych ekranach w ciemnym motywie nie mierzono kontrastu i nie oceniono zrzutów wizualnie; zrzuty są w `evidence/stage3/` do przeglądu.

## Testy i sprawdzenia

Wyniki z przeglądarki (Playwright, system Chrome z `--use-mock-keychain`) są w `POSTEP.md`. Skrypty testowe leżą poza repo.

> Zrzuty ze sprawdzeń (evidence/) leżą poza repo, w vaulcie: 3-Projects/AI-Tech-Leaders-Kurs/Lekcja-07/zrzuty/.
