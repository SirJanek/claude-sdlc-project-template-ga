---
title: MentorHub — specyfikacja ekranów
created: 2026-10-17 18:55:33
status: 🟡 koncepcja wstępna
---

# 04 · Specyfikacja ekranów

Każdy ekran opisano w tym samym układzie: **cel → funkcje → komponenty UI → stany (loading / empty / error / success) → walidacje → endpointy API**. Pełne kontrakty endpointów są w [05-Katalog-API](05-Katalog-API.md). Etykiety UI cytuję po angielsku, tak jak w makiecie.

> [!NOTE]
> **Konwencje wspólne (nie powtarzam ich przy każdym ekranie)**
> - **Loading:** szkielety w miejscu treści. Fragmenty ładują się niezależnie, np. na P3 profil, kalendarz i opinie osobno.
> - **Error (odczyt):** karta „Something went wrong” z treścią błędu i przyciskiem **Try again**, który ponawia tylko ten fragment.
> - **Error (zapis):** 422 pokazuje błędy przy polach z `fields`, 409 i 402 komunikat nad formularzem, 503 toast. Wpisane dane zostają w polach.
> - **Success:** toast przy drobnych akcjach, pełny stan sukcesu przy końcu ścieżki.
> - **Walidacja:** najpierw w przeglądarce (szybka informacja), zawsze **powtórzona na serwerze** (źródło prawdy). Komunikat przy polu, focus na pierwszym błędnym polu.
> - W makiecie każdy stan wymusisz przełącznikiem **Data state** na dolnym pasku.

---

## Grupa P · Publiczne

### P1 · Landing page
- **Cel:** w 10 sekund wyjaśnić wartość (mentor, który „już to zrobił”, tanie intro, gwarancja) i wprowadzić do wyszukiwania.
- **Funkcje:**
  - wyszukiwarka w hero (temat i słowo kluczowe) przekazuje parametry do P2,
  - kafle tematów z liczbą mentorów,
  - polecani mentorzy,
  - sekcja „How it works” w 3 krokach,
  - CTA „Become a mentor”.
- **Komponenty UI:** pasek górny, hero z formularzem, siatka kafli tematów (4 kolumny → 1 na telefonie), karty mentorów (avatar, nazwa, nagłówek, ocena, cena), kroki numerowane, baner CTA.
- **Stany:**
  - **Loading:** szkielety 4 kafli i 4 kart.
  - **Empty:** „No topics yet”, a przy braku polecanych „No featured mentors yet” z linkiem do P2.
  - **Error:** karta błędu osobno dla tematów i dla polecanych; hero działa dalej.
  - **Success:** treść załadowana.
- **Walidacje:** brak; puste pola = wszyscy mentorzy.
- **API:** `GET /api/topics`, `GET /api/mentors?featured=1&limit=4`.

### P2 · Find a mentor
- **Cel:** zawęzić podaż do kilku trafnych mentorów i doprowadzić do profilu lub rezerwacji.
- **Funkcje:**
  - filtry: słowo kluczowe, temat, cena min/max, pora dnia, język, „Super mentors only”,
  - sortowanie: Recommended, cena rosnąco i malejąco, ocena, liczba sesji,
  - stronicowanie „Show more mentors”,
  - na karcie: ulubione ♥, „Book intro”, „Send message”, „Watch intro video” (modal),
  - stan filtrów jest w adresie URL, więc wynik można udostępnić i wrócić do niego przyciskiem Wstecz.
- **Komponenty UI:**
  - panel filtrów (przyklejony na desktopie, nad listą na telefonie),
  - licznik wyników, lista sortowania,
  - karta mentora: avatar, imię, badge Super mentor, kraj, nagłówek, chipy tematów, języki, lata doświadczenia, czas odpowiedzi, skrót bio, ocena, liczba opinii i sesji, cena za 60 min, CTA,
  - modal wideo.
- **Stany:**
  - **Loading:** 3 szkielety kart, licznik „Searching…”.
  - **Empty:** „No mentors match your filters” z przyciskiem „Clear all filters”.
  - **Error:** karta błędu z ponowieniem.
  - **Success:** lista i „You have seen all mentors for these filters” na końcu.
- **Walidacje:**
  - cena min i max: liczby 0–1000, max ≥ min („Max price must be greater than or equal to min price.”),
  - słowo kluczowe ≤ 60 znaków,
  - ♥ i „Send message” jako gość przekierowują do P4 z `next`.
- **API:** `GET /api/mentors?q&topic&priceMin&priceMax&time&language&super&sort&page&limit`, `PUT|DELETE /api/me/favorites/{mentorId}`, `POST /api/threads`.

### P3 · Mentor profile
- **Cel:** zbudować zaufanie i zamienić je w rezerwację intro, sesji albo planu.
- **Funkcje:**
  - nagłówek z oceną, liczbą sesji i mentee, czasem odpowiedzi,
  - wideo intro, „About me”, doświadczenie z adnotacją o weryfikacji,
  - kalendarz tygodniowy (do +5 tygodni) z klikalnymi terminami, które otwierają M1 z wybranym terminem,
  - opinie z odpowiedziami mentora i „Show more reviews”,
  - panel boczny: cena, „Book intro” (jeśli dostępne), „Book a 60-min session”, „See weekly plans”, „Send message”, ♥, gwarancja i zasady anulowania.
- **Komponenty UI:** karta nagłówka z dużym avatarem, odtwarzacz wideo, karty sekcji, siatka 7 dni z przyciskami godzin (zajęte przekreślone, z podpowiedzią przyczyny), lista opinii, przyklejony panel ceny.
- **Stany:**
  - **Loading:** szkielet profilu i panelu.
  - **Empty:**
    - opinie: „No reviews yet” z informacją o gwarancji,
    - kalendarz: „No free slots this week” z „Next week →”.
  - **Error:**
    - 404 „This mentor profile does not exist or is no longer active.”,
    - błędy kalendarza i opinii osobno.
  - **Success:** pełny profil.
- **Walidacje:**
  - termin musi być wolny i co najmniej 4 h od teraz (inaczej przycisk nieaktywny),
  - intro tylko raz na parę mentee–mentor („You already had an intro with …”).
- **API:** `GET /api/mentors/{id}`, `GET /api/mentors/{id}/reviews?page`, `GET /api/mentors/{id}/availability?from&days=7&minutes=60`, `PUT|DELETE /api/me/favorites/{id}`, `POST /api/threads`.

### P4 · Sign up / Log in / Forgot password
- **Cel:** założyć konto lub zalogować się bez gubienia kontekstu (parametr `next` wraca do przerwanej czynności).
- **Funkcje:**
  - zakładki Log in, Sign up, Forgot password,
  - logowanie Google i LinkedIn (OAuth),
  - przy rejestracji wybór „Find a mentor” albo „Become a mentor” (ten drugi kieruje do T1),
  - „Keep me signed in”, zgoda marketingowa opcjonalna.
- **Komponenty UI:** karta z zakładkami, przyciski OAuth, pola z podpowiedziami, przełącznik intencji, checkboxy zgód, przycisk ze spinnerem.
- **Stany:**
  - **Loading:** spinner na przycisku.
  - **Empty:** nie dotyczy.
  - **Error:**
    - 401 „Email or password is incorrect.” (nie zdradza, czy konto istnieje),
    - 409 „An account with this email already exists. Log in instead.” przy polu e-mail,
    - 503 nad formularzem.
  - **Success:**
    - po rejestracji toast o linku potwierdzającym i przejście do `next`, M4 albo T1,
    - reset hasła: „Check your inbox” (zawsze ten sam komunikat).
- **Walidacje:**
  - imię 2–80 znaków,
  - e-mail w poprawnym formacie,
  - hasło min. 8 znaków, w tym litera i cyfra,
  - akceptacja regulaminu wymagana.
- **API:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/password-reset`, (OAuth) `GET /api/auth/oauth/{provider}` — poza makietą.

---

## Grupa M · Mentee

### M1 · Book a session
- **Cel:** wybrać typ sesji i termin w mniej niż minutę i zablokować go na czas płatności.
- **Funkcje:**
  - przełącznik typu: Intro 30 min, 60 min, 30 min,
  - nawigacja tygodniami (do +5), terminy w strefie użytkownika,
  - opcjonalny cel spotkania dla mentora,
  - podsumowanie z ceną,
  - „Continue to payment” blokuje termin na 10 min,
  - gość zostaje skierowany do P4, a termin jest zachowany w adresie.
- **Komponenty UI:** stepper „Choose a time → Pay securely → Confirmation”, mini-karta mentora, przełącznik segmentowy typu, siatka 7 dni (na telefonie przewijana w poziomie), pole tekstowe z licznikiem, przyklejone podsumowanie, notka o gwarancji.
- **Stany:**
  - **Loading:** szkielet siatki terminów.
  - **Empty:** „No free times this week” z „Next week →” i „Message mentor”.
  - **Error:**
    - błąd ładowania terminów z ponowieniem,
    - 409 przy blokadzie: „Someone has just booked this time…” i odświeżenie siatki,
    - 422 przy intro wykorzystanym albo zbyt krótkim wyprzedzeniu.
  - **Success:** przejście do M2.
- **Walidacje:**
  - termin wymagany („Pick a time to continue.”),
  - termin co najmniej 4 h od teraz,
  - intro raz na parę mentee–mentor,
  - cel ≤ 500 znaków.
- **API:** `GET /api/mentors/{id}`, `GET /api/mentors/{id}/availability?from&days=7&minutes={30|60}`, `POST /api/bookings/hold`.

### M2 · Checkout
- **Cel:** bezpiecznie zapłacić za sesję lub plan, z przejrzystą ceną.
- **Funkcje:**
  - licznik blokady terminu (10:00 → 00:00),
  - metody płatności: zapisana karta, nowa karta („Save card for future sessions”), BLIK,
  - kod promocyjny z przeliczeniem,
  - podsumowanie: cena, rabat, opłata serwisowa, suma,
  - „Pay $X” tworzy płatność, a potem rezerwację albo plan.
- **Komponenty UI:** stepper, baner licznika, lista metod jako radio-karty, formularz karty (numer, imię, MM/YY, CVC), pole BLIK, pole promo z „Apply”, karta zamówienia, notka PCI-DSS.
- **Stany:**
  - **Loading:** szkielet metod i wyceny; przycisk „Pay” ze spinnerem.
  - **Empty:** brak koszyka: „Nothing to pay for” z linkami do P2 i M5.
  - **Error:**
    - 402 „Your card was declined…” albo „The BLIK code has expired…”,
    - 422 zły kod promocyjny,
    - nie wczytały się zapisane karty: baner, płatność nową kartą dalej możliwa,
    - blokada wygasła: pełny stan „Your hold has expired” z „Pick another time”.
  - **Success:** sesja prowadzi do M3, plan do M9 z banerem „Your new plan is active”.
- **Walidacje:**
  - numer karty: 13–19 cyfr, suma kontrolna Luhna,
  - imię na karcie min. 2 znaki,
  - data MM/YY w przyszłości,
  - CVC 3–4 cyfry,
  - BLIK 6 cyfr,
  - kod promocyjny: 4–20 znaków alfanumerycznych, ważność sprawdza serwer.
- **API:** `GET /api/me/payment-methods`, `POST /api/checkout/quote`, `POST /api/payments/intents`, `POST /api/bookings` albo `POST /api/subscriptions`.

### M3 · Booking confirmed
- **Cel:** potwierdzić rezerwację i przygotować mentee do sesji.
- **Funkcje:** podsumowanie (z kim, kiedy, ile, strefa czasowa), „Add to calendar” (.ics), „Message mentor”, „Go to my sessions”, 3 karty: przygotowanie, jak dołączyć, zmiany.
- **Komponenty UI:** stepper (wszystko ukończone), karta sukcesu, przyciski akcji, 3 karty informacyjne.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:** nie dotyczy.
  - **Error:** 404 „Booking not found.” albo błąd z ponowieniem.
  - **Success:** „You are booked!”
- **Walidacje:** rezerwacja należy do zalogowanego mentee (403 w innym razie).
- **API:** `GET /api/bookings/{id}`, `POST /api/threads`.

### M4 · Home (pulpit mentee)
- **Cel:** jedno miejsce na „co dalej”: najbliższa sesja, zaległe czynności, plany, postęp.
- **Funkcje:**
  - karta „Next session” z odliczaniem, „Join room” i celem,
  - lista „To do”: oceń sesję, wybierz plan po intro,
  - pozostałe nadchodzące sesje,
  - polecani mentorzy,
  - plany z kredytami i datą odnowienia,
  - postęp: liczba sesji, godzin, tygodni z rzędu.
- **Komponenty UI:** nagłówek z powitaniem, karta wyróżniona, listy, siatka kart mentorów, pasek postępu kredytów, kafle KPI.
- **Stany:**
  - **Loading:** szkielety kart.
  - **Empty:** nowy użytkownik widzi „Start with your first mentor” z „Browse mentors” i „Complete your profile”.
  - **Error:** karta błędu.
  - **Success:** pulpit.
- **Walidacje:** brak (tylko odczyt).
- **API:** `GET /api/me/home`.

### M5 · My sessions
- **Cel:** zarządzać sesjami: dołączyć, przełożyć, anulować, ocenić, zgłosić problem.
- **Funkcje:**
  - zakładki Upcoming, Past, Cancelled,
  - **Upcoming:** „Join room”, „Reschedule” (modal z terminami), „Cancel” (modal z powodem i informacją o zwrocie),
  - **Past:** „Leave a review” albo „Reviewed ✓”, „Book again”, „Report a problem” (modal), rozwijane notatki z sesji,
  - **Cancelled:** powód i „Book again”.
- **Komponenty UI:** zakładki, karty sesji (mentor, typ, data, czas, źródło płatności: plan albo pojedyncza), chip „in 2 days” (pomarańczowy poniżej 12 h), modale z formularzami.
- **Stany:**
  - **Loading:** 3 szkielety kart.
  - **Empty:** osobny komunikat dla każdej zakładki, np. „No upcoming sessions” z „Find a mentor”.
  - **Error:**
    - ładowanie listy: karta błędu z ponowieniem,
    - akcje w modalu: komunikat w modalu.
  - **Success:**
    - przełożenie: toast „Moved to … has been notified”,
    - anulowanie: toast o zwrocie albo jego braku,
    - zgłoszenie: toast „Report D-1xx sent”.
- **Walidacje:**
  - przełożenie: nowy termin wymagany, możliwe co najmniej 12 h przed startem; poniżej 12 h modal informacyjny zamiast formularza,
  - anulowanie: powód wymagany, wiadomość ≤ 300 znaków,
  - zgłoszenie: kategoria wymagana, opis 20–1000 znaków, do 7 dni po sesji.
- **API:** `GET /api/me/sessions?status=upcoming|past|cancelled`, `GET /api/mentors/{id}/availability`, `POST /api/sessions/{id}/reschedule`, `POST /api/sessions/{id}/cancel`, `POST /api/sessions/{id}/report`.

### M6 · Session room
- **Cel:** odbyć sesję wideo bez instalacji, z notatkami, które zostają po spotkaniu.
- **Funkcje:**
  - **Przed wejściem:** podgląd kamery, wybór kamery i mikrofonu, wskaźnik poziomu dźwięku, cel sesji, „Join session”.
  - **W sesji:**
    - licznik czasu, wycisz, kamera, udostępnij ekran, „End session” z potwierdzeniem,
    - panel z zakładkami: Notes (autozapis co ok. 1,2 s), Chat, Agenda.
  - Pokój otwiera się 10 min przed startem.
- **Komponenty UI:** ciemna scena wideo, okienko „You”, pasek sterowania, panel boczny z segmentami, pole notatek ze statusem „Saved at …”.
- **Stany:**
  - **Loading:** szkielet; przy „Join” spinner w trakcie pobierania tokenu.
  - **Empty:** za wcześnie: baner „The room opens 10 minutes before the start”. W prototypie jest przycisk „enter anyway”.
  - **Error:**
    - nie udało się pobrać tokenu: „Could not connect: …” przy przycisku,
    - 410 sesja nieaktywna,
    - autozapis notatek: „⚠ Not saved — retrying…”.
  - **Success:** po zakończeniu mentee przechodzi do M7, mentor do T4.
- **Walidacje:**
  - dostęp mają tylko uczestnicy sesji,
  - token ważny 2 h,
  - notatki ≤ 20 000 znaków (limit serwera).
- **API:** `GET /api/sessions/{id}`, `POST /api/sessions/{id}/room-token`, `PUT /api/sessions/{id}/notes`, `POST /api/sessions/{id}/complete`.

### M7 · Review a session
- **Cel:** zebrać ocenę (jakość podaży) i po intro poprowadzić do następnego kroku.
- **Funkcje:**
  - gwiazdki 1–5 z opisem słownym,
  - tagi („Actionable advice”, „Good listener”…),
  - publiczna opinia, prywatny feedback dla platformy,
  - po intro dwie karty: „Continue with …” (M8) i „Not a fit?” (P2 z gwarancją).
- **Komponenty UI:** mini-karta sesji, gwiazdki jako radio, chipy-checkboxy, pola z licznikami, karta sukcesu, karty następnego kroku.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:**
    - sesja jeszcze się nie odbyła: „Not yet”,
    - już oceniona: „Already reviewed”.
  - **Error:**
    - 409 już oceniona,
    - 422 sesja nieodbyta,
    - błąd odczytu z ponowieniem.
  - **Success:** „Thank you for your review!” i następny krok.
- **Walidacje:**
  - ocena wymagana,
  - przy 1–3★ opinia publiczna wymagana, min. 20 znaków,
  - opinia ≤ 1000 znaków, feedback prywatny ≤ 500,
  - edycja możliwa przez 14 dni.
- **API:** `GET /api/sessions/{id}`, `POST /api/sessions/{id}/review`.

### M8 · Choose a weekly plan
- **Cel:** zamienić udane intro w regularne sesje.
- **Funkcje:**
  - karty planów 1×, 2×, 3× i 5× w tygodniu (cena za 4 tygodnie, liczba kredytów, cena za sesję, „Most popular”),
  - data startu,
  - informacja o auto-odnowieniu,
  - podsumowanie,
  - korzyści: przenoszenie kredytów, darmowe przełożenie, przeniesienie do innego mentora.
- **Komponenty UI:** radio-karty planów, pole daty, karta podsumowania z mini-kartą mentora.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:** „No plans available” z rezerwacją pojedynczej sesji.
  - **Error:** 404 mentor, błąd z ponowieniem.
  - **Success:** przejście do M2 z koszykiem `subscription`.
- **Walidacje:**
  - plan wymagany,
  - data startu od dziś do +30 dni, nie w przeszłości.
- **API:** `GET /api/mentors/{id}/plans` → potem M2 (`POST /api/subscriptions`).

### M9 · Billing & plans
- **Cel:** pełna kontrola nad pieniędzmi: plany, kredyty, karty, faktury.
- **Funkcje:**
  - **Plany:** status, kredyty, cena, data odnowienia, „Schedule session”, „Change plan” (od następnego cyklu), „Move credits” (do innego mentora), „Cancel plan” (z powodem i propozycją pauzy).
  - **Karty:** dodaj, usuń; karty domyślnej opłacającej aktywny plan nie da się usunąć.
  - **Faktury:** tabela z pobraniem PDF.
- **Komponenty UI:** karty planów, lista kart płatniczych z chipem „Default”, tabela faktur, modale: zmiana planu, przeniesienie kredytów, anulowanie, dodanie karty.
- **Stany:**
  - **Loading:** szkielety.
  - **Empty:**
    - „No plans yet” z „Find a mentor”,
    - „No saved cards”,
    - „No invoices yet”.
  - **Error:**
    - karta błędu sekcji,
    - 409 przy usuwaniu karty domyślnej,
    - 422 przy przeniesieniu większej liczby kredytów niż saldo.
  - **Success:** toasty („Plan updated from the next cycle”, „Credits moved”, „Card saved”…), baner powitalny po zakupie planu.
- **Walidacje:**
  - przeniesienie: mentor wymagany, kredyty od 1 do salda,
  - anulowanie: powód wymagany,
  - karta: jak w M2.
- **API:** `GET /api/me/billing`, `PATCH /api/subscriptions/{id}`, `POST /api/subscriptions/{id}/cancel`, `POST /api/subscriptions/{id}/transfer`, `POST /api/me/payment-methods`, `DELETE /api/me/payment-methods/{id}`, `GET /api/invoices/{id}/pdf`.

---

## Grupa C · Wspólne (mentee i mentor)

### C1 · Messages
- **Cel:** komunikacja przed sesją i między sesjami, bez wyprowadzania transakcji poza platformę.
- **Funkcje:**
  - lista wątków z wyszukiwaniem i licznikiem nieprzeczytanych,
  - rozmowa z wiadomościami systemowymi (np. „Session booked for …”),
  - mentee ma w nagłówku „Profile” i „Book”,
  - pole wiadomości z licznikiem,
  - oznaczanie wątku jako przeczytanego.
- **Komponenty UI:** układ dwupanelowy (na telefonie lista nad rozmową), elementy wątków z avatarem i skrótem ostatniej wiadomości, dymki (moje, rozmówcy, systemowe), baner ochrony kontaktu, kompozytor.
- **Stany:**
  - **Loading:** szkielety listy i rozmowy.
  - **Empty:**
    - „No conversations yet” z „Find a mentor”,
    - pusty wątek: „Say hello 👋” z podpowiedzią.
  - **Error:**
    - lista: karta błędu,
    - rozmowa: błąd w prawym panelu,
    - wysyłka: 422 przy polu.
  - **Success:** wiadomość pojawia się w rozmowie.
- **Walidacje:**
  - treść wymagana, ≤ 2000 znaków,
  - przed pierwszą odbytą płatną sesją serwer blokuje e-maile, telefony, linki i nazwy komunikatorów: „For your safety, sharing emails, phone numbers or links is not allowed before your first completed session.”
- **API:** `GET /api/threads`, `GET /api/threads/{id}/messages`, `POST /api/threads/{id}/messages`, `POST /api/threads/{id}/read`, `POST /api/threads` (start z profilu).

### C2 · Notifications
- **Cel:** jedno miejsce na wszystkie zdarzenia z głębokimi linkami.
- **Funkcje:** zakładki All, Sessions, Messages, Payments, System; grupy Today i Earlier; „Mark all as read”; przejście do obiektu; licznik na dzwonku w pasku.
- **Komponenty UI:** zakładki, lista z ikoną typu, kropką nieprzeczytanych i czasem względnym, link do preferencji.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:** „You are all caught up”.
  - **Error:** karta błędu.
  - **Success:** lista, toast po „Mark all as read”.
- **Walidacje:** brak.
- **API:** `GET /api/notifications?kind=`, `POST /api/notifications/read-all`.

### C3 · Account settings
- **Cel:** samodzielne zarządzanie kontem zgodnie z RODO.
- **Funkcje:**
  - **Profile:** zdjęcie, imię, e-mail (zmiana z potwierdzeniem), strefa czasowa, język interfejsu, cele (mentee).
  - **Security:** zmiana hasła (wylogowuje inne urządzenia), 2FA (poza MVP).
  - **Notifications:** macierz e-mail/push dla sesji, wiadomości, płatności i marketingu; przypomnienia o sesjach są zawsze wysyłane.
  - **Privacy:** eksport danych (art. 15/20), usunięcie konta z wpisaniem „DELETE”.
- **Komponenty UI:** zakładki, formularze, tabela z przełącznikami, strefa niebezpieczna z czerwoną ramką.
- **Stany:**
  - **Loading:** szkielet formularza.
  - **Empty:** nie dotyczy.
  - **Error:**
    - 422 „Current password is incorrect.” przy polu,
    - błędy zapisu nad formularzem.
  - **Success:** toasty („Profile saved”, „Password updated. Other devices were signed out.”, „Export requested…”); po usunięciu konta wylogowanie i P1.
- **Walidacje:**
  - imię 2–80 znaków, e-mail w poprawnym formacie, cele ≤ 300 znaków,
  - nowe hasło: min. 8 znaków, litera i cyfra, inne niż obecne, powtórzenie zgodne,
  - usunięcie konta: dokładnie „DELETE”.
- **API:** `GET /api/me`, `PATCH /api/me`, `POST /api/uploads`, `PUT /api/me/password`, `GET|PUT /api/me/notification-preferences`, `POST /api/me/data-export`, `DELETE /api/me`.

---

## Grupa T · Mentor

### T1 · Become a mentor (kreator aplikacji)
- **Cel:** zebrać kompletną, weryfikowalną aplikację przy minimalnym porzuceniu.
- **Funkcje:**
  - **Gość:** strona korzyści i „Create account” (P4 z `intent=mentor`).
  - **Mentee:** 6 kroków, każdy zapisuje szkic:
    1. O tobie: imię, kraj, języki, nagłówek.
    2. Ekspertyza: tematy, lata, rola, firma, LinkedIn.
    3. Profil: zdjęcie, bio, wideo.
    4. Dostępność: siatka tygodniowa i strefa.
    5. Cena: stawka, intro, podgląd zarobku netto.
    6. Podsumowanie z „Edit” przy sekcjach i zgody.
  - „Save & exit”.
  - **Po wysłaniu:** status „Under review” i opis kolejnych etapów.
  - **Mentor i admin:** komunikat, że kreator ich nie dotyczy.
- **Komponenty UI:** stepper 6 kroków, formularze, chipy wyboru (języki, tematy), upload zdjęcia z podglądem, pole bio z licznikiem, siatka dostępności (dni × godziny 07–21), kalkulator zarobku, lista kontrolna podsumowania.
- **Stany:**
  - **Loading:** szkielet przy wczytaniu lub utworzeniu szkicu; spinner przy zapisie kroku i uploadzie.
  - **Empty:** nowa aplikacja to pusty krok 1 z imieniem z konta.
  - **Error:** błędy przy polach, błąd zapisu nad formularzem, błąd uploadu toastem.
  - **Success:** „Application submitted” z terminem decyzji (5 dni roboczych).
- **Walidacje:**
  - krok 1: imię min. 3 znaki, kraj wymagany, 1–5 języków, nagłówek 10–80 znaków,
  - krok 2: 1–3 tematy, doświadczenie ≥ 2 lata (≤ 50), rola wymagana (≤ 80), firma ≤ 80, LinkedIn w formacie `https://www.linkedin.com/in/…`,
  - krok 3: zdjęcie wymagane, bio 150–1500 znaków, wideo opcjonalne z YouTube, Vimeo lub Loom,
  - krok 4: min. 5 h tygodniowo,
  - krok 5: stawka $20–500,
  - krok 6: obie zgody wymagane.
- **API:** `POST /api/mentor-applications`, `GET /api/mentor-applications/me`, `PATCH /api/mentor-applications/{id}`, `POST /api/uploads`, `POST /api/mentor-applications/{id}/submit`.

### T2 · Mentor dashboard
- **Cel:** odpowiedzieć na pytanie „co dziś i co wymaga mojej uwagi”.
- **Funkcje:**
  - KPI: sesje w tygodniu, zarobki w miesiącu, ocena, konwersja intro → plan i odsłony profilu,
  - dzisiejsze sesje z „Join”,
  - „Needs your attention”: nieodpisane wiadomości, notatki po sesji, brak metody wypłaty,
  - siła profilu z listą braków,
  - porada tygodnia.
- **Komponenty UI:** 4 kafle KPI, lista sesji z chipami, lista zadań z przyciskami „Open”, pasek postępu profilu.
- **Stany:**
  - **Loading:** szkielety KPI i kart.
  - **Empty:** „No sessions today” z „Open hours”; zadania: „All done 🎉”.
  - **Error:** karta błędu.
  - **Success:** pulpit.
- **Walidacje:** brak.
- **API:** `GET /api/mentor/dashboard`.

### T3 · Calendar & availability
- **Cel:** kontrolować, kiedy mentee mogą rezerwować, i widzieć tydzień.
- **Funkcje:**
  - **Week:** siatka tygodnia (07–21) z sesjami (intro wyróżnione), godzinami otwartymi i urlopem; nawigacja ←, Today, →; klik w sesję otwiera modal: Join, Message, Cancel z powodem.
  - **Weekly availability:** klikalna siatka godzin z sumą h/tydz., „Save”, „Clear all”.
  - **Time off & rules:**
    - lista urlopów z usuwaniem, formularz od–do z notatką,
    - reguły: minimalne wyprzedzenie, horyzont rezerwacji, przerwa między sesjami.
- **Komponenty UI:** zakładki, kalendarz tygodniowy, legenda, siatka dostępności, formularze dat, modal sesji.
- **Stany:**
  - **Loading:** szkielet kalendarza.
  - **Empty:**
    - tydzień bez sesji: baner „No sessions booked this week yet”,
    - brak urlopów: „No time off planned”.
  - **Error:**
    - 409 urlop koliduje z rezerwacjami (lista sesji do przełożenia),
    - 422 zbyt mała dostępność („Keep at least 2 hours per week open, or pause your profile instead.”),
    - błąd odczytu z ponowieniem.
  - **Success:** toasty („Availability saved — mentees see the new hours now”, „Time off added…”, „Session cancelled — mentee refunded and notified”).
- **Walidacje:**
  - urlop: daty wymagane, początek nie w przeszłości, koniec ≥ początek, notatka ≤ 60 znaków,
  - reguły: wyprzedzenie 1–48 h, horyzont 1–12 tygodni,
  - anulowanie przez mentora: powód 10–300 znaków; ostrzeżenie o wskaźniku niezawodności poniżej 24 h.
- **API:** `GET /api/mentor/sessions?from`, `GET|PUT /api/mentor/availability`, `POST /api/mentor/time-off`, `DELETE /api/mentor/time-off/{id}`, `POST /api/mentor/sessions/{id}/cancel`.

### T4 · My mentees
- **Cel:** prowadzić podopiecznych w czasie (cele, notatki, historia), a nie tylko pojedyncze sesje.
- **Funkcje:**
  - filtry All, Active, Paused, Ended,
  - tabela: plan, liczba sesji, kredyty, następna sesja, status,
  - modal szczegółów: cele, prywatne notatki z dodawaniem, historia sesji, „Message”,
  - głęboki link `?id=` z pulpitu.
- **Komponenty UI:** zakładki, tabela z klikalnymi wierszami, modal z formularzem notatki i listami.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:** „No mentees yet” z „Improve profile”, a przy filtrze „No paused mentees”.
  - **Error:** karta błędu; zapis notatki: błąd przy polu.
  - **Success:** toast „Note saved”, notatka na górze listy.
- **Walidacje:** notatka 3–1000 znaków; notatki widzi tylko mentor (autoryzacja na serwerze).
- **API:** `GET /api/mentor/mentees?status=`, `POST /api/mentor/mentees/{id}/notes`.

### T5 · Earnings & payouts
- **Cel:** przejrzystość pieniędzy: ile zarobiłem, ile mogę wypłacić, ile bierze platforma.
- **Funkcje:**
  - KPI: dostępne do wypłaty z „Withdraw”, w karencji 72 h, aktualna prowizja z liczbą godzin, suma życiowa,
  - wykres netto z 8 tygodni,
  - transakcje: brutto, prowizja, netto, status,
  - metoda wypłaty (IBAN),
  - historia wypłat, progi prowizji.
- **Komponenty UI:** kafle KPI, wykres słupkowy, tabela, karta konta bankowego, lista wypłat, modale „Bank account” i „Withdraw”.
- **Stany:**
  - **Loading:** szkielety.
  - **Empty:** „No transactions yet”, „No payouts yet”; brak konta: baner „Add a bank account to receive payouts.”
  - **Error:**
    - IBAN niepoprawny przy polu,
    - 422 kwota ponad saldo,
    - brak metody wypłaty.
  - **Success:** „Payout method saved”, „Payout requested”; status wypłaty Processing → Paid.
- **Walidacje:**
  - właściciel konta min. 3 znaki,
  - IBAN: format kraju i suma kontrolna mod-97,
  - kwota wypłaty ≥ $50 i ≤ dostępne saldo; przy saldzie poniżej $50 „Withdraw” jest nieaktywny.
- **API:** `GET /api/mentor/earnings`, `PUT /api/mentor/payout-method`, `POST /api/mentor/payouts`.

### T6 · Public profile (edytor)
- **Cel:** poprawiać profil i od razu widzieć, jak wygląda w wynikach wyszukiwania.
- **Funkcje:** edycja nagłówka, tematów, bio, ceny i intro, „Replace intro video”, podgląd karty na żywo, „View as mentee” (P3).
- **Komponenty UI:** formularz z licznikami i chipami, przyklejony podgląd karty z P2.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:** nie dotyczy.
  - **Error:** błędy przy polach, błąd zapisu.
  - **Success:**
    - zmiana tekstu: „Saved. Text changes go live after review (≈24 h).”,
    - zmiana ceny lub tematów: „Profile saved” (od razu).
- **Walidacje:** nagłówek 10–80 znaków, 1–3 tematy, bio 150–1500 znaków, cena $20–500.
- **API:** `GET /api/mentor/profile`, `PATCH /api/mentor/profile`, `POST /api/uploads`.

---

## Grupa A · Administrator

### A1 · Admin overview
- **Cel:** zdrowie marketplace’u w jednym widoku i wejście do kolejek.
- **Funkcje:**
  - KPI z 30 dni: GMV, liczba sesji, konwersja intro → plan, nowi mentee, aktywni mentorzy, NPS,
  - wykres sesji tygodniowo,
  - kolejki z licznikami: aplikacje, spory,
  - ostatnie zdarzenia.
- **Komponenty UI:** kafle KPI, wykres słupkowy, lista kolejek z przyciskami, lista aktywności.
- **Stany:**
  - **Loading:** szkielety.
  - **Empty:** „No data.”, „Nothing new.”
  - **Error:** karta błędu.
  - **Success:** widok.
- **Walidacje:** brak; dostęp tylko dla roli admin.
- **API:** `GET /api/admin/metrics`.

### A2 · Mentor applications
- **Cel:** szybka, uczciwa i udokumentowana decyzja o dopuszczeniu mentora.
- **Funkcje:**
  - zakładki Pending, Changes requested, Approved, Rejected (z licznikami),
  - tabela z wynikami kontroli (ID, LinkedIn, wideo),
  - modal: profil, bio, linki, poprzednia notatka, decyzja Approve / Request changes / Reject z powodem i komunikatem.
- **Komponenty UI:** zakładki, tabela, chipy kontroli ✓/✗, modal z kafelkami kontroli i formularzem decyzji.
- **Stany:**
  - **Loading:** szkielet; w modalu szkielet szczegółów.
  - **Empty:** „Queue is empty — All applications have been reviewed. 🎉”
  - **Error:**
    - 409 „This application has already been decided by another admin.”,
    - błąd szczegółów w modalu z ponowieniem.
  - **Success:** toast zależny od decyzji; wiersz znika z kolejki.
- **Walidacje:**
  - decyzja wymagana,
  - odrzucenie: powód z listy wymagany,
  - prośba o zmiany i odrzucenie: komunikat min. 20 znaków (≤ 1000).
- **API:** `GET /api/admin/mentor-applications?status=`, `GET /api/admin/mentor-applications/{id}`, `POST …/{id}/approve`, `POST …/{id}/request-changes`, `POST …/{id}/reject`.

### A3 · Disputes & reports
- **Cel:** rozstrzygać spory na podstawie dowodów (logi pokoju) w ustalonym SLA.
- **Funkcje:**
  - zakładki Open i Resolved,
  - karta sporu: ID, kategoria, kto, przeciw komu, sesja, kwota, opis, rozwijana oś czasu z logów pokoju,
  - modal „Resolve”: decyzja (pełny zwrot, częściowy zwrot, sesja zastępcza, odrzucenie), kwota, komunikat do obu stron, „strike” niezawodności.
- **Komponenty UI:** zakładki, karty sporów z chipami, element `details` z osią czasu, modal z formularzem.
- **Stany:**
  - **Loading:** szkielet.
  - **Empty:** „No open disputes — Nice, every report has been handled.”
  - **Error:** karta błędu; błąd zapisu w modalu.
  - **Success:** toast „D-1xx resolved — both parties notified”; spór przechodzi do Resolved z opisem rozstrzygnięcia.
- **Walidacje:**
  - decyzja wymagana,
  - przy częściowym zwrocie kwota wymagana, od 0,01 do kwoty sporu,
  - komunikat 20–1000 znaków.
- **API:** `GET /api/admin/disputes?status=`, `POST /api/admin/disputes/{id}/resolve`.

---

## Prototyp · P0 Screen map
- **Cel:** nawigacja recenzenta po wszystkich ekranach i kluczowych ścieżkach (tylko w prototypie).
- **Funkcje:** lista ekranów w grupach z ID i adresem, „Open as …” przełącza rolę i otwiera ekran, lista 6 ścieżek do przeklikania z danymi testowymi.
- **Stany:** statyczny.
- **API:** brak.
