---
title: MentorHub — wstępna koncepcja portalu mentoringowego
created: 2026-10-17 18:55:33
status: 🟡 koncepcja wstępna (do przeglądu)
sources: brief zadania z 2026-10-17 (benchmark funkcjonalny Preply.com)
---

# MentorHub — wstępna koncepcja portalu mentoringowego

> [!NOTE]
> **Co tu jest**
> Koncepcja marketplace’u **mentoringu 1:1 przez wideo**. Preply.com służy jako benchmark funkcjonalny i UX; nazwa, wygląd, teksty i kod są własne. W pakiecie są:
> - 5 dokumentów analitycznych: użytkownicy, use case’y i przepływy, mapa ekranów, specyfikacja ekranów, katalog API,
> - **klikalny prototyp** HTML/CSS/TypeScript z 26 ekranami, 4 rolami i 4 stanami danych.

> [!IMPORTANT]
> **Miejsce w procesie SDLC.** To jest materiał wejściowy (discovery), a nie artefakt SDLC. Na jego podstawie powstał szkic [`docs/sdlc/intent.md`](../sdlc/intent.md), który akceptuje product owner. Wymagania wiążące dla implementacji powstaną dopiero w `docs/sdlc/spec.md` (`/sdlc-spec`). Do tego czasu reguły biznesowe, ekrany i katalog API są **propozycją**: przy rozbieżności wygrywa `spec.md`. Prototyp w `mockups/` służy do dyskusji i nie jest kodem produktu, bo ten będzie w `src/`.

## Dokumenty

| # | Plik | Co zawiera |
|---|---|---|
| 1 | [01-Uzytkownicy-i-potrzeby](01-Uzytkownicy-i-potrzeby.md) | 5 ról (gość, mentee, mentor, admin, systemy zewnętrzne) + B2B poza MVP; potrzeby, bóle, odpowiedź produktu, persony |
| 2 | [02-Use-case-i-przeplywy](02-Use-case-i-przeplywy.md) | 21 use case’ów, 18 reguł biznesowych z parametrami, 6 przepływów (mermaid) ze ścieżkami błędów |
| 3 | [03-Mapa-ekranow-i-nawigacja](03-Mapa-ekranow-i-nawigacja.md) | Inwentarz 26 ekranów, menu według roli, mapy nawigacji, wzorce wspólne |
| 4 | [04-Specyfikacja-ekranow](04-Specyfikacja-ekranow.md) | Dla każdego ekranu: cel, funkcje, komponenty UI, stany loading/empty/error/success, walidacje, endpointy |
| 5 | [05-Katalog-API](05-Katalog-API.md) | Konwencje i 78 endpointów w 7 domenach (77 zaimplementowanych w mocku + OAuth) |
| — | `mockups/` | Prototyp: otwórz `mockups/index.html` dwuklikiem; opis w `mockups/README.md` |

## Benchmark Preply → MentorHub

Wzorce funkcjonalne przeniesione z Preply i dostosowane do mentoringu. Parametry (ceny, progi, prowizje) są **naszymi założeniami** i nie zostały sprawdzone z bieżącym regulaminem Preply.

| Wzorzec z Preply | Wersja MentorHub | Ekran |
|---|---|---|
| Katalog tutorów z filtrami, ceną i wideo na karcie | Katalog mentorów: temat, cena, pora, język, Super mentor | P2 |
| Lekcja próbna | Intro 30 min za połowę ceny 30-minutowej sesji, raz na parę | M1 |
| Gwarancja zamiany tutora | Następne intro u innego mentora gratis | M7 |
| Subskrypcja lekcji tygodniowych | Plan 1/2/3/5× w tygodniu, cykl 4 tygodnie, kredyty | M8, M9 |
| Przeniesienie salda do innego tutora | „Move credits” | M9 |
| Przełożenie / anulowanie do 12 h | Ta sama reguła z jawnym komunikatem o zwrocie | M5 |
| Wbudowana klasa wideo | Pokój wideo z notatkami, czatem i agendą | M6 |
| Wiadomości z blokadą kontaktu poza platformą | Blokada e-mail/telefon/link do pierwszej sesji | C1 |
| Onboarding tutora z akceptacją | Kreator 6 kroków + kolejka admina z kontrolami | T1, A2 |
| Prowizja malejąca z liczbą godzin | 25% → 20% → 15% | T5 |
| Odznaka Super tutor | „Super mentor” | P2, P3 |

**Czego świadomie nie przenosimy:** identyfikacji wizualnej (kolorystyka, typografia, logo), tekstów marketingowych, kodu i nazw własnych.

## Jak przejrzeć prototyp (5 minut)

1. Otwórz `mockups/index.html`, potem **Screen map** na dolnym pasku.
2. Przejdź ścieżkę 1 „Guest → first intro session”. Dane testowe są na mapie ekranów (karta `4242…`, odrzucana `4000 0000 0000 0002`, kod `WELCOME10`).
3. Na dowolnym ekranie przełącz **Data state** na Loading, Empty albo Error: zobaczysz wszystkie stany z dokumentu 04.
4. **API log** pokazuje, które endpointy wywołuje ekran.

## Weryfikacja (2026-10-17)

> [!TIP]
> **Bramka w headless Chrome, prawdziwe kliknięcia (`elementFromPoint`)**
> - **Przegląd tras:** 45 tras × 4 stany danych = 180 renderów, 0 wyjątków JS.
>   - W trybie Error 37 ekranów pokazuje stan błędu z „Try again”.
>   - Pozostałe 8 to formularze bez odczytu (logowanie, rejestracja, reset, Become a mentor i Screen map jako gość, Checkout bez koszyka, ustawienia Security i Privacy); błąd API pokazują dopiero po wysłaniu.
> - **Ścieżki end-to-end:** 46/46 kontroli.
>   - Ścieżki: rezerwacja intro przez gościa, płatność (Luhn, karta wygasła, 402, promo), anulowanie i przełożenie, ocena, plan tygodniowy, blokada kontaktu, kreator mentora z akceptacją admina, spór, urlop z kolizją (409), IBAN mod-97, minimalna wypłata, pokój wideo.
>   - Telefon 390 px: nic nie wystaje poza ekran.
> - **Mutacje:** celowo zepsuta suma Luhna, wyłączona blokada kontaktu i stary CSS mobilny. Bramka złapała 3/3.
> - **Kontrakt:** endpointy w `05-Katalog-API.md` i w mocku są zgodne 77/77 (OAuth celowo poza makietą).

> [!IMPORTANT]
> **Decyzje przed PRD**
> Waluta i VAT, płatne czy darmowe intro, model prowizji, kto wystawia fakturę: lista w [02-Use-case-i-przeplywy](02-Use-case-i-przeplywy.md) (sekcja „Do decyzji przed PRD”). Do tego zakres B2B (sponsor HR) jako pierwszy kandydat po MVP.
