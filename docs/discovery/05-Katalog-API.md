---
title: MentorHub — katalog endpointów API
created: 2026-10-17 18:55:33
status: 🟡 koncepcja wstępna
---

# 05 · Katalog endpointów API (kontrakt wstępny)

Lista odpowiada 1:1 mockowi w makiecie (`mockups/src/data.ts`, funkcje `mock('METODA', '/api/…')`). Każde wywołanie z makiety widać w panelu **API log** na dolnym pasku: metoda, adres, status, czas.

## Konwencje

| Temat | Ustalenie |
|---|---|
| Format | JSON, UTF-8; daty ISO 8601 w UTC; kwoty w jednostkach waluty z dwoma miejscami po przecinku (w produkcji liczby całkowite w centach) |
| Uwierzytelnienie | Sesja w ciasteczku `HttpOnly`, `Secure`, `SameSite=Lax`, ochrona CSRF dla zapisów; OAuth Google i LinkedIn |
| Autoryzacja | Rola (mentee, mentor, admin) i własność zasobu sprawdzane na serwerze przy każdym wywołaniu; brak sesji 401, zła rola lub cudzy zasób 403 |
| Błędy | `{ "error": { "code": "slot_taken", "message": "…", "fields": { "email": "…" } } }` |
| Kody | 200/201 OK · 401 brak sesji · 402 płatność odrzucona · 403 brak uprawnień · 404 brak zasobu · 409 konflikt stanu · 410 zasób nieaktywny · 422 walidacja · 429 limit · 503 awaria |
| Stronicowanie | `?page=&limit=` → `{ items, total, page }` |
| Idempotencja | Nagłówek `Idempotency-Key` wymagany dla `POST /payments/intents`, `/bookings`, `/subscriptions`, `/mentor/payouts` |
| Czas | Klient wysyła i dostaje UTC; strefa użytkownika w profilu (`timezone`) służy tylko do prezentacji i e-maili |

## Uwierzytelnienie i konto

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| POST | `/api/auth/register` | Rejestracja (`name, email, password, intent, terms`) | P4 | 409, 422 |
| POST | `/api/auth/login` | Logowanie, zwraca rolę | P4 | 401, 429 |
| POST | `/api/auth/logout` | Wylogowanie | pasek | — |
| POST | `/api/auth/password-reset` | Link resetu (zawsze 200) | P4 | 429 |
| GET | `/api/auth/oauth/{provider}` | Start OAuth (poza makietą) | P4 | — |
| GET | `/api/me` | Profil zalogowanego | C3 | 401 |
| PATCH | `/api/me` | Zmiana profilu | C3 | 422 |
| PUT | `/api/me/password` | Zmiana hasła, wylogowanie innych urządzeń | C3 | 422 |
| GET, PUT | `/api/me/notification-preferences` | Preferencje powiadomień | C3 | 422 |
| POST | `/api/me/data-export` | Eksport danych (RODO) | C3 | 429 |
| DELETE | `/api/me` | Usunięcie konta | C3 | 409 aktywne spory |
| POST | `/api/uploads` | Upload zdjęcia lub wideo (`kind`) → URL | C3, T1, T6 | 413, 415 |

## Katalog mentorów

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| GET | `/api/topics` | Tematy z liczbą mentorów | P1, P2 | — |
| GET | `/api/mentors` | Wyszukiwanie (`q, topic, priceMin, priceMax, time, language, super, sort, featured, page, limit`) | P1, P2 | 422 |
| GET | `/api/mentors/{id}` | Profil publiczny (+ `introPrice`, `introAvailable`, `favorite`) | P3, M1 | 404 |
| GET | `/api/mentors/{id}/reviews` | Opinie, stronicowane | P3 | 404 |
| GET | `/api/mentors/{id}/availability` | Terminy (`from, days, minutes`) z polem `available` i powodem (`booked`, `notice`) | P3, M1, M5 | 404 |
| GET | `/api/mentors/{id}/plans` | Plany tygodniowe z ceną za 4 tygodnie | M8 | 404 |
| PUT, DELETE | `/api/me/favorites/{mentorId}` | Dodaj lub usuń z ulubionych | P2, P3 | 401 |

## Rezerwacje i płatności

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| POST | `/api/bookings/hold` | Blokada terminu na 10 min → `holdId, expiresAt` | M1 | 409 termin zajęty, 422 intro wykorzystane / za krótkie wyprzedzenie |
| POST | `/api/checkout/quote` | Wycena: suma, rabat, opłata, total | M2 | 422 zły kod |
| GET | `/api/me/payment-methods` | Zapisane karty (tokeny) | M2 | — |
| POST | `/api/me/payment-methods` | Dodaj kartę (token z bramki) | M9 | 422 |
| DELETE | `/api/me/payment-methods/{id}` | Usuń kartę | M9 | 409 karta opłaca aktywny plan |
| POST | `/api/payments/intents` | Płatność kartą lub BLIK | M2 | 402 odrzucona |
| POST | `/api/bookings` | Utworzenie sesji po płatności (`holdId, paymentIntentId, goal`) | M2 | 409 blokada wygasła, 402 |
| GET | `/api/bookings/{id}` | Potwierdzenie rezerwacji | M3 | 403, 404 |
| POST | `/api/subscriptions` | Utworzenie planu tygodniowego | M2 | 402, 422 |
| PATCH | `/api/subscriptions/{id}` | Zmiana liczby sesji (od następnego cyklu) lub pauza | M9 | 404, 422 |
| POST | `/api/subscriptions/{id}/cancel` | Anulowanie odnowienia | M9 | 404 |
| POST | `/api/subscriptions/{id}/transfer` | Przeniesienie kredytów do innego mentora | M9 | 422 za mało kredytów |
| GET | `/api/me/billing` | Plany, karty, faktury w jednym widoku | M9 | — |
| GET | `/api/invoices/{id}/pdf` | Faktura PDF | M9 | 404 |

## Sesje

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| GET | `/api/me/home` | Pulpit mentee (najbliższe, do zrobienia, plany, polecani, statystyki) | M4 | — |
| GET | `/api/me/sessions` | Sesje mentee (`status=upcoming\|past\|cancelled`) | M5 | — |
| GET | `/api/sessions/{id}` | Szczegóły sesji (uczestnicy) | M6, M7 | 403, 404 |
| POST | `/api/sessions/{id}/reschedule` | Nowy termin (≥ 12 h przed startem) | M5 | 409, 422 |
| POST | `/api/sessions/{id}/cancel` | Anulowanie przez mentee → `refunded, refundTo` | M5 | 404 |
| POST | `/api/sessions/{id}/room-token` | Token pokoju wideo (od −10 min) | M6 | 403, 410, 425 za wcześnie |
| PUT | `/api/sessions/{id}/notes` | Autozapis wspólnych notatek | M6 | 413 |
| POST | `/api/sessions/{id}/complete` | Zakończenie sesji | M6 | 409 |
| POST | `/api/sessions/{id}/review` | Ocena (`rating, tags, comment, private`) | M7 | 409 już oceniona, 422 nieodbyta |
| POST | `/api/sessions/{id}/report` | Zgłoszenie problemu → ID sporu | M5 | 422 po terminie 7 dni |

## Wiadomości i powiadomienia

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| GET | `/api/threads` | Lista wątków z ostatnią wiadomością | C1 | — |
| POST | `/api/threads` | Otwórz lub utwórz wątek z mentorem | P2, P3, M3 | 404 |
| GET | `/api/threads/{id}/messages` | Wiadomości wątku | C1 | 403, 404 |
| POST | `/api/threads/{id}/messages` | Wyślij wiadomość | C1 | 422 dane kontaktowe przed pierwszą sesją, 429 |
| POST | `/api/threads/{id}/read` | Oznacz jako przeczytane | C1 | — |
| GET | `/api/notifications` | Powiadomienia (`kind`) + licznik nieprzeczytanych | C2, pasek | — |
| POST | `/api/notifications/read-all` | Oznacz wszystkie | C2 | — |

## Mentor

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| POST | `/api/mentor-applications` | Utwórz szkic aplikacji | T1 | 409 już istnieje |
| GET | `/api/mentor-applications/me` | Moja aplikacja i jej status | T1 | 404 |
| PATCH | `/api/mentor-applications/{id}` | Zapis kroku (szkic) | T1 | 422 |
| POST | `/api/mentor-applications/{id}/submit` | Wyślij do weryfikacji | T1 | 422 braki |
| GET | `/api/mentor/dashboard` | KPI, dziś, zadania, siła profilu | T2 | — |
| GET | `/api/mentor/sessions` | Sesje w tygodniu (`from`) | T3 | — |
| POST | `/api/mentor/sessions/{id}/cancel` | Anulowanie przez mentora (pełny zwrot) | T3 | 404 |
| GET, PUT | `/api/mentor/availability` | Dostępność tygodniowa i reguły | T3 | 422 za mała dostępność |
| POST | `/api/mentor/time-off` | Urlop | T3 | 409 kolizja z rezerwacjami |
| DELETE | `/api/mentor/time-off/{id}` | Usuń urlop | T3 | 404 |
| GET | `/api/mentor/mentees` | Podopieczni (`status`) | T4 | — |
| POST | `/api/mentor/mentees/{id}/notes` | Prywatna notatka | T4 | 404, 422 |
| GET | `/api/mentor/earnings` | Saldo, karencja, prowizja, transakcje, wypłaty | T5 | — |
| PUT | `/api/mentor/payout-method` | Konto do wypłat (IBAN) | T5 | 422 |
| POST | `/api/mentor/payouts` | Zlecenie wypłaty | T5 | 422 kwota / brak konta |
| GET, PATCH | `/api/mentor/profile` | Profil publiczny; PATCH zwraca `moderation: pending\|none` | T6 | 422 |

## Administrator

| Metoda | Ścieżka | Cel | Ekrany | Błędy |
|---|---|---|---|---|
| GET | `/api/admin/metrics` | KPI 30 dni, kolejki, aktywność | A1 | 403 |
| GET | `/api/admin/mentor-applications` | Kolejka (`status`) + liczniki | A2 | 403 |
| GET | `/api/admin/mentor-applications/{id}` | Szczegóły i kontrole | A2 | 404 |
| POST | `/api/admin/mentor-applications/{id}/approve` | Akceptacja | A2 | 409 już zdecydowana |
| POST | `/api/admin/mentor-applications/{id}/request-changes` | Prośba o zmiany (`message`) | A2 | 409, 422 |
| POST | `/api/admin/mentor-applications/{id}/reject` | Odrzucenie (`reason, note`) | A2 | 409, 422 |
| GET | `/api/admin/disputes` | Spory (`status`) z osią czasu | A3 | 403 |
| POST | `/api/admin/disputes/{id}/resolve` | Decyzja (`decision, amount, message, strike`) | A3 | 409, 422 |

> [!WARNING]
> **Czego mock nie robi, a produkcja musi**
> - Webhooki bramki płatności (potwierdzenie, odnowienie, zwrot, chargeback) i dostawcy wideo (wejście i wyjście z pokoju jako dowód w sporze).
> - Zadania w tle: zwolnienie blokad, przypomnienia, odnowienia planów, zwolnienie środków po 72 h, auto-spór przy no-show.
> - Limity zapytań (429) na logowanie, reset hasła i wiadomości; dziennik audytu decyzji admina.
