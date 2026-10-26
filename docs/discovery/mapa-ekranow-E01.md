# Mapa ekranów — Epik E01 „Accounts and roles” (prototyp klikalny)

> **Pytanie prototypu (Houde & Hill, rola):** czy osoba, która pierwszy raz wchodzi do DevMentora, założy konto, zaloguje się GitHubem albo mailem i trafi na swoją stronę — i co zobaczy, gdy coś pójdzie nie tak?

- Utworzono: 2026-10-24 (mapa, nic nie zbudowane)
- Źródła: `.ai/specs/backlog.md`, issues #20/#26/#27 (kryteria akceptacji), `.ai/specs/2026-10-18-accounts-and-roles.md` (Flows, UI/UX, Edge Cases, Grill-me Q1–Q15), `.ai/specs/product-brief.md` (R07, R13, R15, D12, D14, A07, N01), `docs/design-system.md`, `packages/ui/src/docs/screens/e01.*`, `packages/ui/src/docs/guide/what-is-missing.mdx`, kod na gałęzi: `packages/app/src/app/(auth)`, `(mentor)`, `(marketing)`, `admin`, `packages/ui/src/components/auth`.
- Identyfikatory ekranów (s01…) i luk (L01…, DS01…) są stałe — przypinamy do nich komentarze.
- Nazwy ekranów i teksty UI po angielsku (UI aplikacji jest po angielsku), reszta po polsku.

## 0. Historie i kryteria akceptacji w tym przepływie

Numeracja: epik **E01 = #20**; historie **E01-S01 = #26**, **E01-S02 = #27** (`backlog.md` wiersze 11–13). Fazy spec: 1 (e-mail link) ✅, 2 (GitHub) ✅, 3 (#26) ✅, **4 (#27) 🟡 niezaimplementowana**.

| Kod w mapie | Źródło | Treść (skrót) |
|---|---|---|
| **S01-AC1** | #26 | Gość na stronie rejestracji mentora kończy rejestrację → ląduje na profile setup z rolą mentor |
| **S01-AC2** | #26, R07/D11 | Onboarding mentora nie pyta o dane bankowe ani wypłaty |
| **S01-AC3** (neg.) | #26, Grill-me Q1 | E-mail już użyty → zalogowany do istniejącego konta, komunikat „konto istnieje, rola bez zmian”, brak drugiego konta, bez ujawniania maili |
| **S02-AC1** | #27, R13/D12 | Gość wybiera slot bez konta → rejestracja → po weryfikacji maila wraca do tego samego slotu |
| **S02-AC2** (neg.) | #27, R13 | Konto niezweryfikowane → rezerwacja odrzucona do czasu weryfikacji (`403 email_unverified`) |
| ~~S02-AC3~~ | #27 → #32 | Przeniesione do E03-S01 (Grill-me Q2) — poza mapą |
| **F1–F5** | spec › Flows | F1 e-mail link + `/auth/confirm` (GET nic nie konsumuje), F2 GitHub, F3 istniejące konto, F4 `next` (return path), F5 sesja 7 dni, sign out / sign out everywhere |
| **EC-xx** | spec › Edge Cases | EC-link-expired, EC-gh-unverified, EC-gh-failed (denied/state), EC-gh-down (timeout 10 s), EC-mail-503, EC-429, EC-401-db, EC-role-change (`sv`), EC-next-open-redirect, EC-role-admin |
| **R15 / D14** | brief | otwarta rejestracja mentora; zaproszenie = link do `/sign-up/mentor` |
| **Q7 / Q10 / Q11** | spec › Grill-me | admin przez CLI; mentee→mentor tylko CLI; prod tylko GitHub do czasu dostawcy maili |

## 1. Ekrany

Legenda stanów: **D** domyślny, **P** pusty, **Ł** ładowanie/w toku, **B** błąd, **BD** brak dostępu, **K** konflikt, **Z** wynik zewnętrznej usługi. Rola „gość” = niezalogowany. „Operator” w zadaniu = rola **admin** w specyfikacji (patrz L03).

| ID | Ekran (trasa) | Rola: kto widzi / co widzi inny | Stany (źródło) | Historia / kryterium | Komponenty DS |
|---|---|---|---|---|---|
| **s01** | **Home** `/` (`(marketing)`) — dziś także „strona startowa” mentee i admina | Wszyscy. Gość: „Sign in” w nagłówku. Mentee/admin po zalogowaniu lądują tu (landing = `/`). Mentor po zalogowaniu nie trafia tu automatycznie, ale może wejść. | D gość (kod); D zalogowany — nazwa/e-mail + Sign out (spec › UI/UX „Signed-in header”); **K** `?notice=existing_account` po linku dla istniejącego konta (S01-AC3, F3); Ł nagłówek `aria-busy` przy `/api/auth/me` (kod `SessionMenu`, brak w spec → L12) | F4 (rola domyślna), S01-AC3 | `SessionMenu`, `ExistingAccountNotice`, `Button`(jako link); sekcja hero = surowy Tailwind (brak `PageHeader`) |
| **s02** | **Sign in** `/sign-in` | Gość. Zalogowany: strona i tak się renderuje (brak przekierowania — L13). | D: e-mail + „Send me a sign-in link” + „Continue with GitHub” + „Sign up as a mentor” (spec › UI/UX); D-bez-GitHuba gdy GITHUB_* puste (Phase 2 deviation); Ł przycisk disabled podczas wysyłki (kod); B 422 niepoprawny e-mail (API contracts); B 429 `rate_limited` (EC-429); B 503 mail nie wysłany (EC-mail-503); **Z** `?error=github_failed` — odmowa/state/timeout (EC-gh-failed, EC-gh-down); **Z** `?error=github_email_unverified` (EC-gh-unverified); B `?error=invalid_request` (`role=admin`, zły `next`; EC-role-admin, Phase 2 deviation); B `?error=link_invalid`; B nieznany kod → komunikat ogólny (kod); D z `?next=` (S02-AC1, F4) | F1, F2, F4, S02-AC1 | `FormField`+`Input` (dziś surowe `<input>`), `Button`, `Alert` (dziś surowe `<p role=alert>`), przycisk GitHub i separator „or” — brak w DS (DS01, DS02) |
| **s03** | **Set up your mentor profile** — rejestracja mentora `/sign-up/mentor` | Gość (cel: link-zaproszenie, R15). Zalogowany: strona się renderuje (L13). | D: copy „No bank details needed until someone books you.”, e-mail + „Send me a sign-up link”, GitHub `role=mentor`, „Already have an account? Sign in” (S01-AC2, spec › UI/UX); Ł; B 422; B 429; B 503; **Z** github_failed / github_email_unverified (powrót na `/sign-in`, nie na s03 — L14); **K** e-mail istnieje → nie tu, tylko po kliknięciu linku na s08/s01 z notice (S01-AC3) | S01-AC1, S01-AC2, S01-AC3, R15 | jak s02 + akapit wartości (brak `PageHeader`) |
| **s04** | **Check your inbox** `/check-email` | Gość po wysłaniu linku. | D z adresem „We sent a sign-in link to <e-mail>. Open it within 15 minutes.” (spec › UI/UX, F1); Ł odliczanie 60 s „Send a new link (42s)” (spec: resend after 60 s); D „A new link is on its way.” po ponownym wysłaniu (kod); B 429/503 przy ponownym wysłaniu (EC-429, EC-mail-503); **P** brak `?email=` → bez adresu i bez przycisku resend (kod, spec nie opisuje → L15) | F1, S02-AC1 (mentee czeka na weryfikację) | `Button variant="outline"` (dziś surowy), status `role=status`; licznik — brak w DS (DS03) |
| **s05** | **Sign-in e-mail** (skrzynka demo — symulacja maila z linkiem) | Adresat maila (dowolny). W prototypie: panel „Mailbox” zamiast prawdziwej poczty. | D: temat, treść, link `/auth/confirm?token=…` (F1; treść maila nieopisana → L16); D-mentor: ten sam mail z `intentRole=mentor`; D „mail od kogoś innego” (EC: ktoś prosi o link dla cudzego maila — „they get nothing; the owner gets an e-mail they can ignore”) | F1 | poza DS (to nie ekran aplikacji); szablon maila nie istnieje (DS04) |
| **s06** | **Sign in as <e-mail>?** `/auth/confirm?token=` | Każdy, kto ma link (także inne urządzenie — EC). | D: nagłówek z adresem + przycisk „Sign in as <e-mail>” (F1, login-CSRF); Ł przycisk disabled po kliknięciu; **B** „Link not valid” — wygasł / użyty / nieznany (EC-link-expired); **B** 410 po kliknięciu (link zużyty między GET a POST, kod `ConfirmSignIn`); **K** zalogowany już innym kontem otwiera link (nie opisane → L17); D prefetch skanera = nic się nie dzieje (EC, niewidoczne dla człowieka) | F1, S02-AC1 (weryfikacja), S01-AC1 | `Button` (dziś surowy), `Alert` (dziś surowy) |
| **s07** | **GitHub authorisation** (zewnętrzna strona GitHub — symulowana) | Gość po „Continue with GitHub”. | D „Authorize DevMentor” (F2); **Z** użytkownik odmawia (EC-gh-failed); **Z** e-mail niezweryfikowany na GitHub (EC-gh-unverified); **Z** GitHub nie odpowiada > 10 s (EC-gh-down); **Z** podmieniony `state` (EC-gh-failed); **K** e-mail z GitHuba = istniejące konto z linku → jedno konto, GitHub przypięty (EC „Same e-mail via GitHub and via link”); **K** mentor-signup GitHubem na istniejące konto → notice (F3) | F2, S01-AC1, S01-AC3 | poza DS (makieta strony GitHub) |
| **s08** | **Set up your mentor profile** — profile setup `/mentor/profile` (strona startowa mentora) | Mentor. Gość → 307 na `s02` z `?next=/mentor/profile`. Mentee/admin → s09. | D: „Welcome, <name lub e-mail>. You are signed in as a mentor.” + karta „Coming next” (placeholder do E02-S01 #28); **K** `?notice=existing_account` (S01-AC3 — istniejący mentor rejestruje się ponownie); **P** brak imienia → pokazany e-mail (`users.name` nullable, Grill-me Q5); **BD** gość → s02 (Phase 3); **BD** inna rola → s09; B sesja wygasła / `sv` zmienione (rola zmieniona CLI) → przekierowanie na s02 (F5, EC-role-change; nieopisane w UI → L11) | S01-AC1, S01-AC2, S01-AC3 | `SessionMenu`, `ExistingAccountNotice`, karta = surowe `rounded-2xl shadow-sm` (sprzeczne z DS — L09); powinna być `Card`, `PageHeader` |
| **s09** | **Mentor account required** (odmowa na `/mentor/profile`) | Zalogowany mentee lub admin. | **BD** D: „You are signed in with an account that is not a mentor…” + link do `/sign-up/mentor` (Phase 3 deviation: odmowa renderowana zamiast 403) — link prowadzi donikąd dla mentee, bo zmiana roli tylko przez CLI (Q10) → L06 | spec Phase 3 krok 2, Q10 | brak wzorca „Access denied” w DS (DS05); dziś surowy `<p role=alert>` |
| **s10** | **Admin · Dashboard** `/admin` (strona „operatora”) | Admin. Mentee/mentor/gość: strona się renderuje, a dane z API dostają 401/403 → ErrorState; brak dedykowanego ekranu odmowy i przekierowania (L04). Lokalnie: dev admin z odznaką „Dev admin — local only”. | D „Database: Connected”; Ł „Checking database…” (`LoadingMessage`, deprecated); B „Database unreachable”; B błąd API + Retry; **BD** nie-admin → komunikat błędu API zamiast odmowy (kod; spec nie opisuje → L04) | Q7 (admin = zwykłe logowanie + CLI), AGENTS (admin) | `Card`, `Badge`, `ErrorMessage`, `LoadingMessage` (deprecated → `Skeleton`), `AdminNav`, `SessionMenu` |
| **s11** | **Admin · Users** `/admin/users` | Admin (jak s10). | D lista (Name, Email, Role, Created); **P** „No users yet.”; Ł; B + Retry; **BD** mentee → 403 z `/api/users` (integracja Phase 1: „mentee denied on /api/users”); **P** konto bez imienia (name null) — kolumna Name pusta (Q5 vs kod `user.name` → L18) | Phase 1 integracja, Q7 | `DataTable`, `Badge`, `Card` |
| **s12** | **Mentor page with slot** (zaślepka E02-S03 #30) — punkt wejścia mentee | Gość/mentee. Ekran z innego epiku; w prototypie tylko jako start S02-AC1. | D: profil mentora + `SlotList`; D gość klika slot → s02 z `?next=/m/<mentor>?slot=<id>` (spec › UI/UX „Mentee path”); D powrót po weryfikacji z zaznaczonym slotem (S02-AC1); **B** slot w międzyczasie zajęty po powrocie (nieopisane → L08); Phase 4 niezaimplementowana (L07) | S02-AC1, F4 | `MentorCard`, `SlotList`, `PageHeader` |
| **s13** | **Booking refused — verify your e-mail** (zaślepka; trasa E03) | Mentee z kontem niezweryfikowanym (tylko konta z `POST /api/users`). | **BD** `403 email_unverified` (S02-AC2, EC „Unverified (admin-created) account”); D wyjście: „sign in by link verifies it” — brak ekranu/tekstu w spec (L05) | S02-AC2 | `Alert` (danger) + `Button` — tekst nieustalony |
| **s14** | **Signed-in header / Sign out** (element wspólny s01, s08, s10, s11) | Każdy zalogowany; gość widzi „Sign in”. | D nazwa lub e-mail + „Sign out” (spec › UI/UX); Ł `aria-busy`; B błąd wylogowania (kod ignoruje wynik → L12); „Sign out everywhere” — jest w API, brak w UI (F5 → L10) | F5 | `SessionMenu`, `Button variant="outline" size="sm"`, `Badge` |

## 2. Scenariusze do przełączania (kontrolki prototypu, nie funkcje produktu)

| # | Przełącznik | Wartości | Dotyczy | Źródło |
|---|---|---|---|---|
| T01 | Zalogowany jako | gość / mentee (zweryfikowany) / mentee niezweryfikowany / mentor / admin / dev admin (lokalnie) | wszystkie | F5, Q7, S02-AC2 |
| T02 | GitHub skonfigurowany | tak (przycisk widoczny) / nie (ukryty) | s02, s03 | Phase 2 deviation, Q11 |
| T03 | Wynik GitHuba | sukces / odmowa zgody / e-mail niezweryfikowany / timeout 10 s / zły `state` | s07 → s02 | EC-gh-* |
| T04 | Wynik wysyłki linku | wysłano / 422 zły e-mail / 429 limit / 503 mail nie wyszedł | s02, s03, s04 | API contracts |
| T05 | Stan linku z maila | ważny / wygasł (>15 min) / już użyty / zużyty między otwarciem a kliknięciem (410) / otwarty na innym urządzeniu | s06 | F1, EC-link-expired |
| T06 | E-mail istnieje | nie / tak jako mentee / tak jako mentor | s03 → s01/s08 | S01-AC3, F3 |
| T07 | Sesja | ważna / wygasła (7 dni) / unieważniona (`sv`: sign-out-everywhere albo zmiana roli CLI) | s08, s10, s11, s14 | F5, EC-role-change |
| T08 | Zegar resend | odliczanie / gotowy | s04 | spec › UI/UX (60 s) |
| T09 | Wejście z `next` | brak / poprawny (slot) / niepoprawny (`//evil.com`) | s02, s06 | F4, EC-next-open-redirect |
| T10 | Baza danych (admin) | up / down / błąd API | s10, s11 | kod admin |
| T11 | Lista użytkowników | pusta / kilka / wiele (50) / imię puste | s11 | kod `DataTable` |
| T12 | Slot po powrocie | wolny / zajęty | s12 | L08 (stan do decyzji) |

## 3. Konta i dane demo (wszystko fikcyjne)

**Stały „teraz” zegara demo:** poniedziałek **26 Oct 2026, 10:00 Europe/Warsaw** (CET, +01:00) — spójne z `packages/ui/src/docs/fixtures.ts` („Tomorrow, 18:00” = slot 27 Oct 18:00). Link z maila ważny do 10:15; licznik resend 60 s; sesja 7 dni → do 2 Nov 10:00.

| Konto | E-mail | Rola | Metoda | Stan |
|---|---|---|---|---|
| Gość | — | — | — | brak sesji |
| Kuba Lis | `kuba.lis@example.test` | mentee | e-mail link | zweryfikowany, imię puste (pokazuje się e-mail) |
| Ola Mazur | `ola.mazur@example.test` | mentee | `POST /api/users` (admin) | **niezweryfikowana** (S02-AC2) |
| Marta Kowalczyk | `marta.kowalczyk@example.test` | mentor | GitHub `marta-k` | zweryfikowana; profil-placeholder |
| Tomasz Nowak | `tomasz.nowak@example.test` | mentor | e-mail link | zweryfikowany; służy do S01-AC3 (ponowna rejestracja mentora) |
| Piotr Zając | `piotr.zajac@example.test` | mentee | e-mail link | do S01-AC3 wariant „mentee rejestruje się jako mentor” (rola bez zmian) |
| Ewa Operator | `ewa.ops@example.test` | admin | GitHub + `make set-role` | zweryfikowana |
| Dev admin | — | admin (dev) | `ALLOW_DEV_ADMIN=1` | tylko lokalnie, odznaka |
| GitHub bez maila | `gh-unverified` | — | GitHub | primary e-mail niezweryfikowany (T03) |

**Połączenie ról:** spec Q5 = **jedna rola na konto**, więc konta „mentee + mentor” nie ma; zamiast niego Piotr Zając (mentee) testuje próbę rejestracji jako mentor (→ L06).

**Dane z briefu/fixtures (do zaślepki s12):** mentor Marta Kowalczyk, „Staff engineer, TypeScript compiler errors and monorepo builds”, `$45 / 25 min · $80 / 50 min`, sloty Tue 27 Oct 18:00 (25 min, $45), Tue 27 Oct 18:30 (50 min, $80), Wed 28 Oct 07:30 (25 min, $45). Ceny ustala mentor (R11); prowizja 10% link / 20% katalog — **nie pokazywać** (DS: `PriceSummary` bez prowizji). Bez ocen (N02), bez wideo (N01).

## 4. Luki w specyfikacji (do decyzji właściciela — Jan)

Każda: pytanie + opcje; ★ = rekomendacja. **Mapa zatwierdzona 2026-10-24 22:59:01: Jan wybrał „wszystko A” (20/20).**

**L01 — Brak przepływu „mentor onboarding” w briefie.** Brief › Key flows ma tylko „booking and session”; R07 i R15 (oraz D14) dotyczą dołączania mentora, a ich obszar to „mentor onboarding”, którego nie ma jako przepływu. Mapa s03 → s05 → s06/s07 → s08 opiera się na spec, nie na briefie.
Pytanie: czy dopisać do briefu przepływ „mentor onboarding (1.0)”?
- A ★ Tak, krótki przepływ w Key flows (link-zaproszenie → `/sign-up/mentor` → profile setup bez wypłat → publikacja w E02) — brief zostaje źródłem prawdy dla R07/R15.
- B Nie, wystarczy spec E01 + E02 — mniej pracy, ale brief i spec rozjeżdżają się dalej.
- C Dopisać przy `om-discover --refresh` razem z D14 (Q7) — jedna zmiana briefu zamiast dwóch.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Tak, krótki przepływ w Key flows (link-zaproszenie → `/sign-up/mentor` → profile setup bez wypłat → publikacja w E02) — brief zostaje źródłem prawdy dla R07/R15.

**L02 — Brak ekranu „Mentee sign-up”: spec vs DS.** Spec: mentee zakłada konto przez `/sign-in` (pierwszy link tworzy konto mentee). Storybook E01 ma osobny ekran „Mentee sign-up”, a `what-is-missing.mdx` mówi „Sign-in… not in backlog”.
Pytanie: czy mentee ma mieć osobną stronę rejestracji?
- A ★ Nie — jedna strona `/sign-in` dla logowania i rejestracji mentee; poprawić Storybook E01 i „What is missing”. Mniej kroków (A07).
- B Tak — `/sign-up` z copy dla mentee (kontekst slotu), technicznie to samo API.
- C Tylko inne copy na `/sign-in`, gdy jest `next` ze slotem („Create an account to book this time”).

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Nie — jedna strona `/sign-in` dla logowania i rejestracji mentee; poprawić Storybook E01 i „What is missing”. Mniej kroków (A07).

**L03 — „Operator” nie istnieje w specyfikacji.** Zadanie mówi o roli operator; spec/AGENTS mają role guest, mentee, mentor, **admin**; brief nie nazywa żadnej roli operacyjnej.
Pytanie: czy „operator” = admin?
- A ★ Tak, operator = admin; w prototypie etykieta „admin”, bez nowej roli.
- B Operator to osobna rola (np. obsługa zwrotów) — wymaga zmiany spec i Q5 (jedna rola na konto).
- C Odłożyć do E05 (miary) / E06 — w E01 brak strony operatora.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Tak, operator = admin; w prototypie etykieta „admin”, bez nowej roli.

**L04 — Strona startowa i odmowa dla admina.** Admin po zalogowaniu ląduje na `/` (landing tylko mentor → `/mentor/profile`, reszta `/`). `/admin` dla nie-admina renderuje się, a dane pokazują błąd API; dla gościa nie ma przekierowania na sign-in. Spec tego nie opisuje.
Pytanie: gdzie ląduje admin i co widzi nie-admin na `/admin`?
- A ★ Admin → `/admin`; gość → `/sign-in?next=/admin`; inna rola → ekran „Access denied” (ten sam wzorzec co s09).
- B Admin → `/` jak dziś, `/admin` z linku; odmowa jak dziś (błąd API) — zero pracy, gorszy komunikat.
- C Ukryć istnienie `/admin` dla nie-adminów (404) — mniej ujawnia, trudniej diagnozować.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Admin → `/admin`; gość → `/sign-in?next=/admin`; inna rola → ekran „Access denied” (ten sam wzorzec co s09).

**L05 — S02-AC2 bez ekranu.** „Booking refused until the e-mail is verified” — jest tylko `403 email_unverified`; nie ma tekstu ani ścieżki naprawy (spec: „signing in by link verifies it”), a ekran rezerwacji to E03.
Pytanie: co widzi niezweryfikowany mentee przy próbie rezerwacji?
- A ★ Alert na ekranie rezerwacji: „Verify your e-mail to book — we'll send you a link” + przycisk wysyłający link z `next` = ten slot.
- B Przekierowanie na `/sign-in?next=<slot>` bez wyjaśnienia — prościej, mniej jasne.
- C Nie projektować w E01 (konta admin-owe są rzadkie), przenieść do #32.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Alert na ekranie rezerwacji: „Verify your e-mail to book — we'll send you a link” + przycisk wysyłający link z `next` = ten slot.

**L06 — Link „/sign-up/mentor” na ekranie odmowy prowadzi donikąd dla mentee.** s09 każe mentee założyć konto mentora, ale ten sam e-mail tylko loguje do konta mentee z „role was not changed” (F3), a zmiana roli to CLI (Q10).
Pytanie: co powiedzieć mentee, który chce zostać mentorem?
- A ★ Tekst „To mentor, contact us” (kanał kontaktu do ustalenia) i usunięcie linku do `/sign-up/mentor` z s09.
- B Zostawić link, dopisać „use a different e-mail address” — dwa konta tej samej osoby.
- C Wyciągnąć self-service zmiany roli z E06 do E01.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Tekst „To mentor, contact us” (kanał kontaktu do ustalenia) i usunięcie linku do `/sign-up/mentor` z s09.

**L07 — Faza 4 (#27) niezaimplementowana, a punkt wejścia (strona mentora) jest w E02.** S02-AC1 wymaga strony z slotem (E02-S03 #30), której nie ma.
Pytanie: jak pokazać S02-AC1 w prototypie?
- A ★ Zaślepka s12 z danymi demo (oznaczona „E02 stub”) — testujemy powrót do slotu, nie stronę mentora.
- B Wyłączyć S02-AC1 z prototypu do czasu E02.
- C Startować z dowolnego adresu z `?next=`, bez strony mentora.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Zaślepka s12 z danymi demo (oznaczona „E02 stub”) — testujemy powrót do slotu, nie stronę mentora.

**L08 — Slot zajęty w czasie weryfikacji.** Storybook E01: „Hold time for the chosen slot while verifying (15 min) — PROPOSAL, not in the spec”. Spec nic nie mówi o tym, co widzi mentee po powrocie, gdy slot zniknął.
Pytanie: czy trzymać slot i co pokazać, gdy przepadł?
- A ★ Bez blokady w E01; po powrocie komunikat „This time was just booked — pick another” + lista slotów (decyzja w #32).
- B Blokada 15 min (= ważność linku) — wymaga modelu rezerwacji tymczasowej (E03).
- C Nie obsługiwać w 1.0.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Bez blokady w E01; po powrocie komunikat „This time was just booked — pick another” + lista slotów (decyzja w #32).

**L09 — Ekrany `(auth)`/`(mentor)` łamią zasady DS.** Kod używa palety (`slate`, `indigo`, `red-50`, `amber-50`), `rounded-2xl shadow-sm`, surowych `<input>`/`<p role=alert>`; AGENTS mówi „Tailwind dla public pages, shadcn dla admin”, a `docs/design-system.md` „every import from `@mentorhub/ui`” i zakazuje palety (lint:tokens).
Pytanie: która reguła obowiązuje dla stron publicznych?
- A ★ DS dla wszystkich ekranów (tokeny, `FormField`, `Alert`, `Card`); AGENTS doprecyzować — prototyp od razu na DS.
- B Public pages = wolny Tailwind, DS tylko admin — prototyp wiernie jak kod.
- C Prototyp na DS, refaktor kodu osobnym zadaniem po teście.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — DS dla wszystkich ekranów (tokeny, `FormField`, `Alert`, `Card`); AGENTS doprecyzować — prototyp od razu na DS.

**L10 — „Sign out everywhere” bez UI.** API `POST /api/auth/sign-out {everywhere:true}` jest (F5, mitygacja sesji 7 dni z Q6/Q13), ale UI ma tylko „Sign out”.
Pytanie: gdzie użytkownik może wylogować wszystkie urządzenia?
- A ★ W menu konta w nagłówku (druga pozycja, `DropdownMenu`), z potwierdzeniem.
- B Tylko w przyszłych ustawieniach konta (E06).
- C Tylko admin przez CLI (`set-role` bump) — wtedy uzasadnienie 7 dni z Q13 słabnie.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — W menu konta w nagłówku (druga pozycja, `DropdownMenu`), z potwierdzeniem.

**L11 — Sesja wygasła / unieważniona: brak stanu UI.** Spec: stary cookie → 401. Nie wiadomo, co widzi osoba w trakcie (np. na s08 albo w formularzu).
Pytanie: co pokazać po wygaśnięciu sesji?
- A ★ Przekierowanie na `/sign-in?next=<bieżąca strona>` z informacją „Your session ended — sign in again”.
- B Ciche przekierowanie bez komunikatu (dzisiejsze zachowanie stron serwerowych).
- C Alert w miejscu z przyciskiem „Sign in”, bez zmiany strony (dla formularzy z treścią).

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Przekierowanie na `/sign-in?next=<bieżąca strona>` z informacją „Your session ended — sign in again”.

**L12 — Nagłówek: ładowanie i błąd wylogowania.** `SessionMenu` ma stan ładowania (pusty element) i ignoruje błąd `sign-out`; spec mówi tylko „name + Sign out”.
Pytanie: czy błąd wylogowania ma stan?
- A ★ Tak: przycisk „Signing out…”, przy błędzie inline alert + „Try again” (zgodnie z DS RowAction).
- B Nie — zawsze przeładuj stronę (cookie i tak czyszczone po stronie serwera).

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Tak: przycisk „Signing out…”, przy błędzie inline alert + „Try again” (zgodnie z DS RowAction).

**L13 — Zalogowany wchodzi na `/sign-in` lub `/sign-up/mentor`.** Strony renderują formularz bez względu na sesję; spec nie opisuje.
Pytanie: co widzi zalogowany?
- A ★ Przekierowanie na swoją stronę startową (mentor → s08, reszta → s01).
- B Formularz + informacja „You are signed in as <e-mail>. Sign out to use another account.”
- C Bez zmian.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Przekierowanie na swoją stronę startową (mentor → s08, reszta → s01).

**L14 — Błąd GitHuba z rejestracji mentora wraca na `/sign-in`, nie na `/sign-up/mentor`.** Kontekst mentora (copy o braku danych bankowych, R07) ginie.
Pytanie: dokąd wracać po błędzie GitHuba?
- A ★ Na stronę, z której wystartowano (`/sign-up/mentor?error=…`).
- B Zawsze `/sign-in` (jak dziś) — prościej, `intentRole` i tak przepada.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Na stronę, z której wystartowano (`/sign-up/mentor?error=…`).

**L15 — `/check-email` bez adresu.** Bez `?email=` strona nie pokazuje adresu ani resend; spec mówi tylko „Check your inbox at …”.
Pytanie: czy to dopuszczalny stan?
- A ★ Pokazać link „Use a different e-mail” do `/sign-in` jako jedyne wyjście.
- B Przekierować na `/sign-in`.
- C Zostawić.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Pokazać link „Use a different e-mail” do `/sign-in` jako jedyne wyjście.

**L16 — Treść maila z linkiem nieopisana.** Spec definiuje tylko port `send({to, subject, text})`; brak tematu, treści, nadawcy, informacji „jeśli to nie Ty, zignoruj”, wersji mentor/mentee.
Pytanie: kto i kiedy ustala treść maila?
- A ★ Teraz w spec E01 (temat, 3 zdania, „ignore if not you”, ważność 15 min), dostawca w osobnej spec (Q3).
- B Razem ze spec dostawcy maili (po E02, Q11).
- C Prototyp z treścią roboczą oznaczoną „draft”.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Teraz w spec E01 (temat, 3 zdania, „ignore if not you”, ważność 15 min), dostawca w osobnej spec (Q3).

**L17 — Link otwarty przy zalogowanym innym koncie.** `/auth/confirm` nazywa konto z linku, ale nie mówi, co się stanie z bieżącą sesją.
Pytanie: co pokazać?
- A ★ „You are signed in as A. Continue as B?” — kliknięcie zastępuje sesję.
- B Odmowa: „Sign out first”.
- C Bez zmian (sesja po cichu zastąpiona).

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — „You are signed in as A. Continue as B?” — kliknięcie zastępuje sesję.

**L18 — Imię konta: kiedy i gdzie.** `users.name` nullable (Q5/Q12); mentor podaje je w E02-S01, mentee przy pierwszej rezerwacji. Do tego czasu nagłówek i admin pokazują e-mail lub puste pole (lista admina zakłada `user.name`).
Pytanie: jak pokazywać konto bez imienia?
- A ★ Wszędzie e-mail jako zastępstwo (nagłówek, powitanie, lista admina).
- B Pytać o imię zaraz po pierwszym logowaniu — dodatkowy krok, sprzeczny z A07.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Wszędzie e-mail jako zastępstwo (nagłówek, powitanie, lista admina).

**L19 — Copy strony głównej i rejestracji mentora sprzeczne z briefem.** `/` mówi „1:1 video sessions… Start with a 25-minute intro at half price”, `/sign-up/mentor` „start taking intro sessions”, marka „MentorHub”. Brief: sesje tekstowe (N01 — no video), cena ustalana przez mentora (R11), brak „intro za pół ceny”, produkt „DevMentor”.
Pytanie: jakie copy w prototypie?
- A ★ Copy zgodne z briefem („paid 25/50-minute text sessions”, marka DevMentor); kod poprawić osobnym zadaniem.
- B Copy jak w kodzie — prototyp testuje to, co jest.
- C Neutralne placeholdery bez obietnic produktowych.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Copy zgodne z briefem („paid 25/50-minute text sessions”, marka DevMentor); kod poprawić osobnym zadaniem.

**L20 — Środowisko wdrożone: tylko GitHub (Q11), a formularz e-mail i tak widoczny.** Mock maili jest odrzucany w produkcji; nie opisano, co widzi osoba bez GitHuba na wdrożonym środowisku.
Pytanie: co pokazujemy pierwszym mentorom bez konta GitHub?
- A ★ Ukryć formularz e-mail, gdy brak dostawcy maili (symetrycznie do ukrywania GitHuba), z tekstem „E-mail sign-in is coming soon”.
- B Formularz widoczny, błąd 503 „We couldn't send the e-mail”.
- C Zaproszenia wyłącznie do osób z GitHubem — bez zmiany UI.

> [!success] Decyzja (2026-10-24 22:59:01, Jan): **A** — Ukryć formularz e-mail, gdy brak dostawcy maili (symetrycznie do ukrywania GitHuba), z tekstem „E-mail sign-in is coming soon”.

## 5. Luki w design systemie

| ID | Brak | Ekrany | Uwagi |
|---|---|---|---|
| DS01 | Przycisk „Continue with GitHub” (dostawca zewnętrzny, ikona marki) | s02, s03 | dziś surowy `<a>` z SVG; DS nie ma wariantu dla OAuth |
| DS02 | Separator „or” między metodami logowania | s02, s03 | surowe `h-px bg-slate-200` |
| DS03 | Przycisk z odliczaniem („Send a new link (42s)”) — „disabled with a reason” | s04 | DS zabrania „disabled without a reason”; brak wzorca licznika |
| DS04 | Szablon e-maila transakcyjnego | s05 | DS opisuje tylko UI w przeglądarce |
| DS05 | Wzorzec „Access denied / wrong role” (odmowa z wyjściem) | s09, s10, s11, s13 | jest `ErrorState` (load failed + retry), ale nie odmowa dostępu |
| DS06 | Układ strony publicznej / auth (wąska kolumna, nagłówek z marką, `SessionMenu`) | s01–s04, s06, s08, s09 | `Shell.tsx` tylko w Storybook; każda strona ma własny `<header>` |
| DS07 | Komunikat informacyjny (notice) w tokenach | s01, s08 | `ExistingAccountNotice` używa palety `amber-*`; `Alert` nie ma wariantu info/warning udokumentowanego dla tego przypadku |
| DS08 | Wzorzec ekranu „confirm” (pojedyncze pytanie + jeden przycisk) | s06 | — |
| DS09 | `LoadingMessage` deprecated, a używany na s10 | s10 | zamienić na `Skeleton` |
| DS10 | Storybook E01 pokazuje „Sign-up — e-mail taken” (błąd pola) | — | sprzeczne z Q1 (bez ujawniania maili) i S01-AC3; story do usunięcia/zmiany (powiązane z L02) |
| DS11 | Menu konta z „Sign out everywhere” | s14 | zależne od L10 |

## 6. Liczby

- **Ekrany:** 14 (s01–s14; w tym 2 symulacje zewnętrzne s05, s07 i 2 zaślepki z innych epików s12, s13)
- **Stany:** 72 (suma pozycji w kolumnie „Stany” tabeli §1: s01 4, s02 12, s03 7, s04 5, s05 3, s06 6, s07 7, s08 6, s09 1, s10 5, s11 6, s12 4, s13 2, s14 4 — wliczone stany opisane w spec, kodzie i stany do decyzji)
- **Scenariusze do przełączania:** 12 (T01–T12)
- **Luki w specyfikacji:** 20 (L01–L20) — rozstrzygnięte 20/20 (wszystkie A), otwarte 0
- **Luki w design systemie:** 11 (DS01–DS11)
