---
title: MentorHub — use case'y i przepływy użytkownika
created: 2026-10-17 18:55:33
status: 🟡 koncepcja wstępna
---

# 02 · Najważniejsze use case'y i kompletne przepływy

Identyfikatory ekranów (P*, M*, C*, T*, A*) odpowiadają [03-Mapa-ekranow-i-nawigacja](03-Mapa-ekranow-i-nawigacja.md) i makietom (ID widać na dolnym pasku makiety).

## Katalog use case'ów

| ID | Use case | Aktor | Ekrany | Priorytet |
|---|---|---|---|---|
| UC-01 | Znajdź i oceń mentora | Gość, Mentee | P1, P2, P3 | MVP |
| UC-02 | Zarezerwuj sesję intro (pierwsza wizyta) | Gość → Mentee | P3, M1, P4, M2, M3 | MVP |
| UC-03 | Zarezerwuj pojedynczą sesję | Mentee | P3, M1, M2, M3 | MVP |
| UC-04 | Wykup plan tygodniowy po intro | Mentee | M7, M8, M2, M9 | MVP |
| UC-05 | Przełóż lub anuluj sesję | Mentee | M5 | MVP |
| UC-06 | Odbądź sesję w pokoju wideo | Mentee, Mentor | M6 | MVP |
| UC-07 | Oceń sesję / zgłoś problem | Mentee | M7, M5 | MVP |
| UC-08 | Napisz do mentora / mentee | Mentee, Mentor | C1 | MVP |
| UC-09 | Zarządzaj planami, kredytami, kartami i fakturami | Mentee | M9 | MVP |
| UC-10 | Zarządzaj kontem, powiadomieniami, RODO | Wszyscy zalogowani | C2, C3 | MVP |
| UC-11 | Złóż aplikację mentora | Mentee | T1 | MVP |
| UC-12 | Ustaw dostępność, urlop i reguły | Mentor | T3 | MVP |
| UC-13 | Prowadź podopiecznych (cele, notatki) | Mentor | T4 | MVP |
| UC-14 | Anuluj sesję jako mentor | Mentor | T3 | MVP |
| UC-15 | Wypłać zarobki | Mentor | T5 | MVP |
| UC-16 | Edytuj profil publiczny | Mentor | T6 | MVP |
| UC-17 | Rozpatrz aplikację mentora | Admin | A2 | MVP |
| UC-18 | Rozstrzygnij spór | Admin | A3 | MVP |
| UC-19 | Monitoruj marketplace | Admin | A1 | MVP |
| UC-20 | Procesy systemowe: przypomnienia, odnowienia, blokady, zwolnienie środków | System | — | MVP |
| UC-21 | Plany opłacane przez firmę (B2B) | Sponsor HR | — | po MVP |

## Reguły biznesowe (parametry konfigurowalne)

Wartości poniżej to **założenia startowe**. W kodzie makiety zebrano je w obiekcie `RULES` w `mockups/src/data.ts`.

| Reguła | Wartość startowa | Gdzie działa |
|---|---|---|
| Sesja intro | 30 min, połowa ceny 30-minutowej sesji, raz na parę mentee–mentor | M1, M2 |
| Gwarancja satysfakcji | Jeśli intro nie pasuje, następne intro u innego mentora gratis | M7, A3 |
| Minimalne wyprzedzenie rezerwacji | 4 h (mentor może ustawić 1–48 h) | M1, T3 |
| Blokada terminu na czas płatności | 10 min, potem termin wraca do puli | M1 → M2 |
| Darmowe przełożenie / anulowanie | Do 12 h przed sesją; później kredyt lub płatność przepada, mentor dostaje wynagrodzenie | M5 |
| Anulowanie przez mentora | Zawsze pełny zwrot dla mentee; poniżej 24 h obniża wskaźnik niezawodności | T3, A3 |
| Pokój wideo | Otwiera się 10 min przed startem | M6 |
| Plan tygodniowy | 1/2/3/5 sesji tygodniowo, rozliczenie co 4 tygodnie, auto-odnowienie, anulowanie w każdej chwili | M8, M9 |
| Niewykorzystane kredyty | Przechodzą na kolejny cykl jeden raz; po anulowaniu planu ważne do końca cyklu | M9 |
| Przeniesienie kredytów | Do innego mentora, przeliczone wartościowo | M9 |
| Opłata serwisowa | $1,50 za transakcję | M2 |
| Prowizja platformy | 25% → 20% od 50 h → 15% od 200 h przepracowanych; z intro platforma zatrzymuje całość | T5 |
| Zwolnienie środków mentora | 72 h po sesji (okno na reklamację) | T5 |
| Minimalna wypłata | $50 | T5 |
| Ochrona kontaktu | Blokada e-maili, telefonów i linków w wiadomościach do pierwszej odbytej płatnej sesji | C1 |
| Zgłoszenie problemu | Do 7 dni po sesji; pierwsza odpowiedź do 24 h | M5, A3 |
| Moderacja profilu | Zmiany nagłówka, bio i wideo idą do akceptacji (ok. 24 h); cena i tematy od razu | T6 |
| Decyzja o aplikacji | Do 5 dni roboczych; odrzucenie i prośba o zmiany wymagają uzasadnienia | A2 |

> [!IMPORTANT]
> **Do decyzji przed PRD**
> 1. Waluta i podatki: USD w makiecie; czy PLN/EUR i VAT OSS?
> 2. Czy intro ma być płatne (jak w makiecie), czy darmowe 15 min (inny lejek, wyższe ryzyko no-show)?
> 3. Model prowizji: progresywny (jak w makiecie) czy stały procent?
> 4. Kto wystawia fakturę mentee: platforma (model agencyjny) czy mentor (marketplace)?

---

## Przepływ F1 · Gość → pierwsza sesja intro (UC-01, UC-02)

```mermaid
flowchart TD
  A[P1 Landing] -->|wybiera temat i szuka| B[P2 Find a mentor]
  B -->|filtry, sortowanie| B
  B -->|karta mentora| C[P3 Mentor profile]
  C -->|Book intro| D[M1 Book a session]
  D -->|wybiera typ i termin| D
  D -->|Continue, jako gość| E[P4 Sign up]
  E -->|konto utworzone,<br/>wybór terminu zachowany| D
  D -->|Continue to payment| H{POST /bookings/hold}
  H -->|409 termin zajęty| D
  H -->|OK, blokada 10 min| F[M2 Checkout]
  F -->|kod promo, metoda płatności| F
  F -->|402 karta odrzucona| F
  F -->|blokada wygasła| D
  F -->|płatność OK| G[M3 Booking confirmed]
  G --> I[M4 Home: odliczanie do sesji]
```

**Kroki główne**
1. Gość wybiera temat na P1 albo od razu przegląda katalog P2.
2. Na P2 zawęża listę filtrami (temat, cena, pora dnia, język, Super mentor) i sortuje.
3. Na P3 ogląda wideo, opinie i kalendarz, potem klika „Book intro”.
4. Na M1 wybiera typ sesji i termin oraz opcjonalnie wpisuje cel spotkania.
5. Jako gość zostaje przekierowany do P4 (rejestracja). Po założeniu konta wraca na M1 z zachowanym terminem (parametry `next` i `slot`).
6. „Continue to payment” blokuje termin na 10 min (`POST /api/bookings/hold`).
7. Na M2 wybiera kartę zapisaną, nową albo BLIK, opcjonalnie wpisuje kod promocyjny i płaci.
8. M3 pokazuje potwierdzenie, przycisk „Dodaj do kalendarza” (.ics), wiadomość do mentora i następne kroki.

**Ścieżki alternatywne i błędy**
- **Brak wyników na P2:** pusty stan z „Clear all filters”.
- **Mentor nie oferuje intro albo intro już wykorzystane:** M1 pokazuje tylko sesje płatne i wyjaśnienie.
- **Brak wolnych terminów w tygodniu:** pusty stan z „Next week” i „Message mentor”.
- **409 przy blokadzie:** ktoś właśnie zarezerwował termin. Komunikat w miejscu, siatka terminów odświeża się sama.
- **402 przy płatności:** karta odrzucona albo BLIK wygasł. Komunikat nad formularzem, dane zostają w polach.
- **Blokada wygasła:** M2 przechodzi w stan błędu z przyciskiem „Pick another time”.
- **Zły kod promocyjny:** błąd przy polu, suma bez zmian.

## Przepływ F2 · Po intro → plan tygodniowy (UC-04, UC-07, UC-09)

```mermaid
flowchart TD
  A[M6 Session room] -->|End session| B[M7 Review]
  B -->|ocena 1-5, tagi, komentarz| C{Typ sesji}
  C -->|intro| D[Następny krok]
  C -->|zwykła| H[M4 Home]
  D -->|Continue with mentor| E[M8 Choose a weekly plan]
  D -->|Not a fit| F[P2 Find a mentor<br/>intro gratis z gwarancji]
  E -->|1/2/3/5 sesji w tygodniu,<br/>data startu| G[M2 Checkout<br/>płatność cykliczna]
  G -->|OK| I[M9 Billing: plan aktywny]
  I -->|Schedule session| J[M1 Book: sesja z kredytu]
```

**Kroki główne**
1. Po sesji mentee trafia na M7. Ocena jest wymagana; przy 1–3★ wymagany jest też komentarz (min. 20 znaków).
2. Po ocenie intro widzi dwie drogi: „Continue with mentor” (M8) albo „Find another mentor” (gwarancja).
3. Na M8 wybiera liczbę sesji w tygodniu i datę startu (od dziś do 30 dni). Widzi cenę za 4 tygodnie.
4. Płatność cykliczna na M2 (koszyk typu `subscription`).
5. M9 pokazuje aktywny plan, kredyty i datę odnowienia. Sesje rezerwuje się z kredytów na M1.

**Alternatywy:**
- **Mentor nie ma planów:** pusty stan z rezerwacją pojedynczej sesji.
- **Zmiana planu (M9):** obowiązuje od następnego cyklu.
- **Anulowanie planu:** wymaga powodu; plan się nie odnawia, kredyty działają do końca cyklu.
- **Przeniesienie kredytów:** wybór mentora i liczby kredytów nie większej niż saldo; 422 przy przekroczeniu.

## Przepływ F3 · Cykl życia sesji (UC-05, UC-06, UC-07, UC-14, UC-18)

```mermaid
flowchart TD
  H[Hold 10 min] -->|płatność OK| S[Scheduled]
  H -->|timeout / porzucenie| X0[Released]
  S -->|mentee przekłada ≥12 h| S
  S -->|mentee anuluje ≥12 h<br/>zwrot / kredyt wraca| C1[Cancelled]
  S -->|mentee anuluje poniżej 12 h<br/>bez zwrotu| C2[Cancelled late]
  S -->|mentor anuluje<br/>pełny zwrot| C3[Cancelled by mentor]
  S -->|pokój otwarty -10 min,<br/>obie strony weszły| L[In progress]
  S -->|mentor nie dołączył| NS[No-show]
  L -->|End session| D[Completed]
  D -->|mentee ocenia| R[Reviewed]
  D -->|zgłoszenie ≤7 dni| DS[Dispute]
  NS --> DS
  DS -->|A3: zwrot / sesja zastępcza / odrzucenie| RS[Resolved]
  D -->|po 72 h| P[Środki dostępne do wypłaty]
```

**Szczegóły kroków**
- **Przełożenie (M5):** modal z dostępnymi terminami tego mentora. Poniżej 12 h modal wyjaśnia regułę i proponuje wiadomość do mentora.
- **Anulowanie (M5):** powód jest wymagany. Komunikat zależy od czasu: zielony przy zwrocie, pomarańczowy przy jego braku.
- **Pokój (M6):**
  - przed czasem widać baner „Room opens 10 min before”,
  - ekran przed wejściem: kamera, mikrofon, poziom dźwięku,
  - w trakcie: licznik, wycisz, kamera, udostępnij ekran, notatki z autozapisem, czat i agenda,
  - „End session” wymaga potwierdzenia.
- **Zgłoszenie problemu (M5, sesje przeszłe):** kategoria i opis min. 20 znaków. Zgłoszenie trafia do A3 z osią czasu z logów pokoju.

## Przepływ F4 · Zostań mentorem → akceptacja (UC-11, UC-17)

```mermaid
flowchart TD
  A[P1 / nawigacja: Become a mentor] --> B{Zalogowany?}
  B -->|nie| C[T1: korzyści + CTA] --> D[P4 Sign up<br/>intent = mentor] --> E
  B -->|tak| E[T1 krok 1: O tobie]
  E --> F[krok 2: Ekspertyza<br/>tematy 1-3, lata ≥2, LinkedIn]
  F --> G[krok 3: Profil<br/>zdjęcie, bio 150-1500, wideo]
  G --> H[krok 4: Dostępność ≥5 h/tydz.]
  H --> I[krok 5: Cena $20-500, intro]
  I --> J[krok 6: Podsumowanie + zgody]
  J -->|Submit| K[Status: Under review]
  K --> L[A2 kolejka admina]
  L -->|Approve| M[Profil live, rola Mentor → T2]
  L -->|Request changes + komentarz| N[E-mail do kandydata → T1 poprawki]
  L -->|Reject + powód + komentarz| O[E-mail z uzasadnieniem]
```

- Każdy krok zapisuje szkic (`PATCH /api/mentor-applications/{id}`); „Save & exit” wraca później do tego samego kroku.
- Na kroku 6 każda sekcja ma „Edit”, który wraca do odpowiedniego kroku.
- **Decyzja admina (A2):** 409, jeśli inny admin zdecydował wcześniej. Każda decyzja ma autora i znacznik czasu (audyt).

## Przepływ F5 · Codzienna praca mentora (UC-12, UC-13, UC-15, UC-16)

```mermaid
flowchart TD
  A[T2 Dashboard] -->|Today: Join| B[M6 Session room]
  A -->|Needs attention| C[C1 Messages]
  A -->|Needs attention| D[T4 Mentees: notatka po sesji]
  A --> E[T3 Calendar]
  E -->|Weekly availability| E1[Siatka godzin → PUT availability]
  E -->|Time off| E2{Konflikt z rezerwacjami?}
  E2 -->|tak 409| E3[Lista kolidujących sesji → przełóż/anuluj]
  E2 -->|nie| E4[Urlop zapisany]
  E -->|klik w sesję| E5[Szczegóły → Join / Message / Cancel]
  A --> F[T5 Earnings]
  F -->|brak konta| F1[Add bank account: IBAN mod-97]
  F -->|Withdraw ≥$50 ≤ dostępne| F2[Wypłata: processing → paid]
  A --> G[T6 Profile: podgląd na żywo → moderacja]
```

## Przepływ F6 · Bezpieczeństwo i spory (UC-08, UC-18)

```mermaid
flowchart TD
  A[C1: wiadomość z e-mailem/telefonem/linkiem] --> B{Była już płatna sesja?}
  B -->|nie| C[422: treść zablokowana<br/>komunikat przy polu]
  B -->|tak| D[Wiadomość wysłana]
  E[M5: Report a problem] --> F[A3 kolejka sporów]
  F --> G[Oś czasu z logów pokoju]
  G --> H{Decyzja}
  H -->|pełny zwrot| I[Zwrot do metody płatności / kredyt]
  H -->|częściowy zwrot ≤ kwota| I
  H -->|sesja zastępcza| J[Kredyt gratis]
  H -->|odrzucenie| K[Mentor otrzymuje środki]
  H -->|+ strike niezawodności| L[3 strike = profil wstrzymany]
```

## Procesy systemowe (UC-20) — bez ekranu, ale z konsekwencjami w UI

| Proces | Wyzwalacz | Efekt widoczny w UI |
|---|---|---|
| Zwolnienie blokady terminu | 10 min bez płatności | M2 „Your hold has expired” |
| Przypomnienia | 24 h i 1 h przed sesją | e-mail, push, C2 |
| Auto-odnowienie planu | co 4 tygodnie | faktura w M9, powiadomienie C2; nieudane obciążenie = plan wstrzymany i baner |
| Zwolnienie środków mentora | 72 h po sesji bez sporu | T5: Pending → Available |
| Oznaczenie no-show | mentor nie wszedł w ciągu 15 min | automatyczny spór w A3 |
| Prośba o ocenę | koniec sesji | M4 „To do”, C2 |
