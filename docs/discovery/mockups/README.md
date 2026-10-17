# MentorHub — clickable prototype

Static HTML/CSS/TypeScript prototype of a 1:1 mentoring marketplace. No backend: a mock REST API runs in the browser with in-memory demo data.

## Open

Double-click `index.html` (works from `file://`, no server needed). The compiled bundle is already in `dist/app.js`.

## Prototype controls (dark bar at the bottom)

| Control | What it does |
|---|---|
| Role | Guest / Mentee / Mentor / Admin — switches navigation and permissions |
| Data state | Live (success) · Loading (requests never finish) · Empty (all lists empty) · Error (every API call returns 503) |
| Screen map | `#/map` — all 26 screens with IDs and "Open as…" buttons, plus 6 key paths |
| API log | Every mock API call: method, URL, status, latency |
| Reset demo | Restores the demo data |

## Test data

- Log in with any email; include `mentor` or `admin` in the address to enter that role. Password `wrong` → 401.
- Sign-up with `taken@example.com` → 409.
- Card `4242 4242 4242 4242` → success, `4000 0000 0000 0002` → declined (402), any number failing the Luhn check → validation error. BLIK `000000` → expired.
- Promo code `WELCOME10` → 10% off.
- IBAN `PL61 1090 1014 0000 0712 1981 2874` is valid.
- Some free slots simulate a race condition (409 "Someone has just booked this time").
- Messages to a mentor without a completed session cannot contain emails, phone numbers or links.

## Build from source

```bash
npx -y -p typescript@5.9.3 tsc -p tsconfig.json   # writes dist/app.js
```

| File | Content |
|---|---|
| `src/core.ts` | State, mock API client with log, hash router, actions, UI kit, validation |
| `src/data.ts` | Demo data, business rules (`RULES`), mock endpoints (same paths as `05-Katalog-API.md`) |
| `src/screens-public.ts` | P0 Screen map, P1 Landing, P2 Find a mentor, P3 Mentor profile, P4 Auth |
| `src/screens-mentee.ts` | M1 Book, M2 Checkout, M3 Confirmed, M4 Home, M5 My sessions, M6 Room, M7 Review, M8 Plans, M9 Billing |
| `src/screens-shared.ts` | C1 Messages, C2 Notifications, C3 Settings |
| `src/screens-mentor.ts` | T1 Become a mentor, T2 Dashboard, T3 Calendar, T4 Mentees, T5 Earnings, T6 Profile |
| `src/screens-admin.ts` | A1 Overview, A2 Applications, A3 Disputes |
| `src/main.ts` | Event delegation and prototype controls |

The visual identity, copy and code are original. Preply.com served only as a functional/UX benchmark.
