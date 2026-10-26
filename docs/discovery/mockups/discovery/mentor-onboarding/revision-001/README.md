# Mentor onboarding - discovery prototype, revision 001

- Brief: `.ai/specs/product-brief.md` (read-only, unchanged)
- Flow: "mentor onboarding" - **not present in the brief's Key flows** (only "Current state" and "booking and session (1.0)"); proposed flow is [ASSUMPTION] A-P1
- Revision date: 2026-10-24 · previous revision: none
- Panel report: none supplied
- Simulation boundary confirmed by Jan (product owner), 2026-10-24: "plan OK, AAA"

## Actor, start, success

- Actor: a senior engineer becoming a mentor.
- Start: an invitation link, which is just a link to the open mentor sign-up (R15).
- Success: account created, profile with a public-work link saved, share link shown; no payout details asked (R07).
- Excluded: publishing slots and prices (E02) - shown as a labelled "outside this prototype" screen.

## Preserved rules and decisions (source: brief, owner Jan unless stated)

| ID | Meaning kept | Where in prototype |
|---|---|---|
| R15 / D14 | Anyone may create a mentor account; invitations are links to it | invite screen, /sign-up/mentor |
| R07 / D11 | Payout details only after first booking | note on profile; no payout fields |
| R08 / N02 (founder A) | Public-work link + plain description, no scores | required link, optional description, no ratings |
| R09 / D06 | Catalogue only by opt-in; share link always | checkbox off by default; share link on ready screen |
| R11 / D08 | Mentor sets price | not in onboarding (E02), per owner answer |
| D16 | Sign-in tokens kept 30 days | not visible in UI |

Change path for any of these: the brief's Decisions/Business rules owner (Jan; R08/N02 founder A). The prototype changes none.

## Assumptions (missing from the brief)

| ID | Assumption | Owner answer 2026-10-24 | How to check |
|---|---|---|---|
| A-P1 | [ASSUMPTION] Flow: invite link -> /sign-up/mentor -> GitHub or e-mail link -> profile (no payouts) -> publish in E02 | approved (L01; add to brief later, not in this lesson) | brief refresh |
| A-P2 | [ASSUMPTION] GitHub sign-in for mentors | approved | brief refresh / spec |
| A-P3 | [ASSUMPTION] E-mail sign-in link as the second method; expired link + resend states | approved | spec |
| A-P4 | [ASSUMPTION] Invitation may or may not carry a sender name (test toggle) | approved | spec |
| A-P5 | [ASSUMPTION] Required: display name + public-work link; description optional | approved | spec |
| A-P6 | [ASSUMPTION] Prices 25/50 NOT in onboarding; only a "next step" note (keeps onboarding short, cf. A07) | Jan: (a) belongs to E02 | brief refresh |
| A-P7 | [ASSUMPTION] GitHub sign-in pre-fills the public-work link with the GitHub profile URL as an editable suggestion | Jan: (b) yes | spec |
| A-P8 | [ASSUMPTION] A profile without slots is public under the share link and shows "No times available yet" | Jan: (c) yes | brief refresh |

Owner answers decide the simulation, not the brief; tags stay until the brief is updated through its change path.

## Screen/state map

| Screen id | Action | Next | IDs |
|---|---|---|---|
| invite | Create a mentor account | sign-up | R15, A-P4 |
| sign-up | Continue with GitHub | github-wait -> profile (link pre-filled) | A-P2, A-P7 |
| sign-up | Email me a sign-in link (empty/invalid -> inline error) | check-email | A-P3 |
| check-email | Open link / Open expired link / Resend | profile / link-expired / status | A-P3 |
| link-expired | Send a new link | check-email | A-P3 |
| profile | Save (missing name/link -> errors, focus first) | ready | R07, R08, R09, A-P5, A-P6 |
| ready | Copy link / View public page / Publish times / Edit | status / public / publish / profile | D06, A-P8 |
| public | Back | ready | R08, A-P8 |
| publish | Back (outside prototype, E02) | ready | A-P6 |
| not-found | Go to start | invite | - |
| Test state | Plain invitation toggle; Reset simulation | - | - |

## Verification (2026-10-24, agent-browser 0.39.1 via `npx --no-install`)

Static review: no external URLs, scripts, fonts, storage, fetch or form posts; inputs rendered via text nodes; neutral styling. Passed.

Browser walk: script `evidence/walk.sh`, 29/29 checks passed (after one fix to the test itself: keyboard tab count and narrow-viewport scroll). Covered: entry and focus, plain-invite toggle, e-mail validation (empty, invalid, valid), check-email, expired link and resend, profile errors and correction, no payout/price fields, ready + share link + catalogue state, public page "No times available yet", browser back/forward, E02 boundary, unknown fragment, Reset and guarded screens after reset, GitHub loading + editable pre-fill + edit + catalogue opt-in, keyboard Tab/Enter with heading focus and visible outline, 375 px viewport without horizontal scroll. Screenshots: `evidence/01-…13-*.png`; accessibility snapshot `evidence/snapshot-invite.txt`.

Limitation: controls were addressed by CSS id selectors in the script rather than by snapshot refs; screen-reader announcements were not listened to (only the live region exists).

## Use

Open `index.html` in a browser (offline). "Reset simulation" restores the start. All data is fictitious; this prototype is not research evidence and does not satisfy the Definition of Ready.
