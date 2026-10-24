# DevMentor — product brief

- Date: 2026-10-18
- Mode: own; Owner: Jan; Pass: Quick pass
- Evidence basis: seven interviews held by the two founders between 2026-08-20 and 2026-09-03 (four developers looking for help, one of whom solves problems alone; three senior engineers on the mentor side), one 14-day help-channel export and one 54-response survey from the same developer Discord, five competitor pages checked on 2026-09-04, workshop and board exports, and decisions D01–D16. Interviews are founders' notes, conducted in Polish; the survey records stated intentions, not payments. The most consequential untested belief is A01: that a developer with a deadline pays for a scheduled text session.
- Coverage: 65 claims — 58 sourced (interview 12, data 3, document 38, product 0, benchmark 5), 0 synthetic, 7 assumed; 1 entries on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: Jan, 2026-10-18, with A01 untested and to be tested; ready for: implementation planning of the stated scope
- Sources: `.ai/specs/research/` (interviews, `2026-09-04-*` data and benchmark notes, `2026-09-0*-miro-board-*`, `2026-08-26-workshop-export.md`, `decisions/`); superseded: `docs/discovery/`, `docs/sdlc/intent.md` (see D01)

## Decision summary

Decision (agreed, Jan, 2026-10-18): the first release is paid 25/50-minute text sessions booked in a mentor's calendar; the vault, MCP access and async questions come later (D04, D05).

Who has the problem: developers stuck on a concrete technical problem before a deadline, with no senior to ask. Three interviewees described such a case; today they search, ask on Discord, and ship a workaround or slip the release. In the Discord export a fifth of help threads got no human reply (see Problems).

What we build now: a mentor profile with a link to public work and no ratings, the mentor's share link plus an opt-in catalogue, slots with a visible earliest start, prepayment through Stripe, and the text session; the mentor sets the price, may decline with a full refund, and free cancellation runs to 12 h before (Scope, D06–D09, R01–R12).

What could change this: the interviewees asked for an answer within twenty minutes to the same day; a booked slot does not promise that (D05). No interview established how many hours mentors would give, and only 3 of 54 survey respondents have ever paid anyone (A01, A03, Q06). A required verified account before booking (D12) works against the same urgency (A07).

Next: lay out the backlog from Now. Success is measured on both sides (D10), but thresholds and a date are not set (Q01); A01 still needs a test or an explicit decision by Jan to build without one.

## Vision

Mentors earn twice: once for the session, and again every time the knowledge from it helps someone else — the founders' intended direction, not a demonstrated benefit. `[DOCUMENT]` research/2026-09-02-miro-board-vision-target-needs.md

## Target group and stakeholders

- Customer (pays): the developer, in two accounts out of their own pocket ("klient mi nie placi za odrabianie lekcji"; the other ended on "chyba"); one would pay only if the employer does. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md, 2026-09-02-interview-freelancer-react.md, 2026-09-02-interview-platform-dev-solves-alone.md
- In the survey 24 of 54 said they would pay themselves and 19 named the employer — stated intentions. `[DATA]` research/2026-09-04-survey-discord-willingness-to-pay.md
- User (mentee): an employed or freelance developer with a concrete blocker and a deadline and no senior available. `[INTERVIEW]` research/2026-08-20-interview-working-dev.md, 2026-09-01-interview-backend-dev-fintech.md, 2026-09-02-interview-freelancer-react.md
- A developer in a 200-person company with an internal channel did not need outside help and would pay only for a rare, expensable one-off. `[INTERVIEW]` research/2026-09-02-interview-platform-dev-solves-alone.md
- User (mentor): a senior engineer who already answers the same questions unpaid, from a private notes file. `[INTERVIEW]` research/2026-08-22-interview-mentor.md, 2026-09-03-interview-senior-python-meetups.md
- Beachhead chosen by the founders: English-speaking TypeScript, React, Python and AI-agent developers. `[DOCUMENT]` research/2026-09-02-miro-board-vision-target-needs.md
- Stakeholders: today the two founders hold every internal role; QA and legal have nobody. `[DOCUMENT]` research/2026-09-05-miro-board-raci-matrix.md
- Decider for scope decisions: Jan (D01, D04–D16); founder A owns N01, N02.

## Problems, with evidence

- A developer stuck on a TypeScript error the day before a release, with the only senior on leave, spent 40 minutes on Stack Overflow, got two contradictory Discord answers and shipped a workaround: "half a day, and I still don't trust that code". `[INTERVIEW]` research/2026-08-20-interview-working-dev.md
- A backend developer's Helm upgrade broke staging on a Friday evening; an hour of search and a wrong Discord answer on Saturday ended in a rollback and a release slipped to Tuesday. `[INTERVIEW]` research/2026-09-01-interview-backend-dev-fintech.md
- A freelancer estimated a migration he had never done after two evenings of reading and an "it depends" on Discord; the estimate was about a week too low. `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md
- In 14 days a ~4,000-member Discord had 109 help threads; 23 (21%) got no human reply; the median first reply among the rest was 68 minutes. `[DATA]` research/2026-09-04-data-request-discord-help.md
- 31 threads carried an urgency signal ("release tomorrow", "prod is down"); 9 of them got no reply. `[DATA]` research/2026-09-04-data-request-discord-help.md
- Mentors answer the same three questions every week or month, unpaid, by pasting from a private doc ("two evenings a month, for free, and the notes rot"). `[INTERVIEW]` research/2026-08-22-interview-mentor.md, 2026-09-03-interview-senior-python-meetups.md
- Frequency per developer is unknown: every account is one episode, and "ciągle" was never quantified. `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md (interviewer's remarks)

## Product and how it stands out

- What it is: booking and paying for a short text session with a senior engineer who has done the specific thing (Scope). `[DOCUMENT]` research/decisions/D04-first-release-paid-text-sessions.md
- What makes it different: trust from public work instead of ratings, and a mentor-owned link instead of a marketplace listing by default — a hypothesis, see A02, A04.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|
| Codementor | request-to-live-session is the whole product; $15–80 per 15 min on React cards | transactional; every card shows 5.0, so rating carries no information | 2026-09-04 | https://www.codementor.io/react-experts |
| MentorCruise | free intro call before payment | monthly relationship from $100/month, the model a staff engineer refused | 2026-09-04 | https://mentorcruise.com/ |
| Topmate | one expert, one link, own price; 10% via own link, 20% via marketplace | any profession; a stranger cannot find the right expert | 2026-09-04 | https://topmate.io/pricing |
| Preply | 25/50-min trials, free cancellation up to 12 h | recurring lessons, not one-off blockers; ratings on every card | 2026-09-04 | https://preply.com/en/how-it-works |
| ADPList | booking in minutes; session count as a trust signal that is not a rating | free; nothing about mentors earning | 2026-09-04 | https://adplist.org/ |

`[BENCHMARK]` research/2026-09-04-benchmark-codementor.md
`[BENCHMARK]` research/2026-09-04-benchmark-mentorcruise.md
`[BENCHMARK]` research/2026-09-04-benchmark-topmate.md
`[BENCHMARK]` research/2026-09-04-benchmark-preply.md
`[BENCHMARK]` research/2026-09-04-benchmark-adplist.md

## Goals and success criteria

- Business goal: success is measured on both sides — invited mentors publishing slots and getting a first booking, and paid sessions held; thresholds and date not set (Q01). `[DOCUMENT]` research/decisions/D10-success-measured-on-both-sides.md
- The board's goals (100 mentors with vaults, 30% of mentees on a vault subscription) describe the later vault model. `[DOCUMENT]` research/2026-09-02-miro-board-product-goals.md
- User outcome: a developer gets an answer over text from someone who has done that exact thing, before their deadline. `[INTERVIEW]` research/2026-08-20-interview-working-dev.md, 2026-09-01-interview-backend-dev-fintech.md
- Primary metric, baseline today, threshold, date: the D10 measures; threshold and date not set (Q01). Baseline available: 21% of Discord help threads unanswered, median 68 minutes (Problems).
- What must not get worse: nothing from a session is published without the mentee's approval (R02); no scores on mentor pages (N02).

## Scope

- **Now:** a mentor signs up openly (R15) and creates a profile (public-work link, R08), publishes 25/50-minute slots (R01) and shares a link; a mentor may join the catalogue (R09). A mentee reaches a mentor by link or catalogue, sees price and earliest start (R03, D05), creates a verified account (R13), books a slot, writes the question (R05), pays upfront at the mentor's price (R04, R11) and holds the session over text (N01). The mentor may decline (R12); cancellation and no-shows follow R06, R10; earnings are paid out per R14. D04, D06–D09, D12, D13.
- **Later:** the knowledge vault, MCP access from coding agents, async questions with a 24 h reply, AI answers from mentor notes, session notes, subscriptions, team plans. D04
- **Not doing:** see Non-goals

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Session | A 25- or 50-minute text exchange at a booked time (R01) | mentor | mentee, mentor |
| Earliest start | The first bookable slot shown before booking; not a promise of availability (D05) | mentor's calendar | mentee |
| Share link | A mentor's own link to their profile and slots (D06) | mentor | anyone with the link |
| Catalogue | A searchable list of mentors who chose to be in it (R09) | platform | public |
| Public work | Repos, posts or talks the mentor links to instead of ratings (N02) | mentor | public |
| Vault | Mentor-owned notes sold by subscription — later, not in the first release | mentor | subscribers |

## Key flows

- Current state: problem → asking friends, LinkedIn, Discord → judging an expert from scattered profiles → messages without reply → time ping-pong → ad hoc payment → call with time lost on introduction → no notes afterwards; the founders' reconstruction from one interview. `[DOCUMENT]` research/2026-09-02-miro-board-journey-current-state.md
- Future state, booking and session (1.0): (1) the mentee opens a mentor's share link or the catalogue (D06); (2) sees public work, price and earliest start (R03, R08, D05); (3) picks a 25 or 50-minute slot (R01), signing up with a verified account first if needed (R13); (4) writes the question (R05); (5) pays and the booking is confirmed (R04, D09); (6) the mentor sees the question and may decline with a full refund (R12), otherwise the session runs over text (N01); (7) nothing is published (R02). Cancellation and no-shows: R06, R10.

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Sessions are 25 or 50 minutes, held over text | booking, session | `[DOCUMENT]` research/2026-08-26-workshop-export.md, N01 | active | unknown | superseding row by founder A | founder A | none |
| R02 | Nothing from a session is published without the mentee's approval | session, later vault | `[DOCUMENT]` research/2026-08-26-workshop-export.md | active | when the vault is scoped | superseding row by both founders | founders A and B | none |
| R03 | Price and earliest start are visible before the mentee writes anything | profile, booking | `[INTERVIEW]` research/2026-09-02-interview-freelancer-react.md; confirmed in D11 | active | unknown | Jan | Jan | none |
| R04 | The mentee pays before the session, through Stripe only | checkout | `[DOCUMENT]` research/2026-08-26-workshop-export.md, D04 | active | unknown | Jan | Jan | none |
| R05 | The mentor sees the mentee's question before the session | booking | `[DOCUMENT]` research/decisions/D09-instant-booking-mentor-may-decline.md | active | unknown | Jan | Jan | none |
| R06 | If the mentor does not show, the mentee is refunded automatically the same day | refunds | `[DOCUMENT]` research/decisions/D07-cancellation-12h-same-day-refund.md | active | unknown | Jan | Jan | none |
| R07 | A mentor gives payout details only after the first booking | mentor onboarding | `[INTERVIEW]` research/2026-09-03-interview-senior-python-meetups.md; confirmed in D11 | active | unknown | Jan | Jan | none |
| R08 | A mentor page carries a link to public work and a plain description; no scores | profile | `[DOCUMENT]` research/decisions/N02-no-ratings.md | active | unknown | superseding record by founder A | founder A | none |
| R09 | A mentor appears in the catalogue only after choosing to | catalogue | `[DOCUMENT]` research/decisions/D06-share-link-plus-opt-in-catalogue.md | active | unknown | Jan | Jan | none |
| R10 | The mentee cancels or reschedules free up to 12 h before the session; later, or on a mentee no-show, the payment goes to the mentor | cancellation | `[DOCUMENT]` research/decisions/D07-cancellation-12h-same-day-refund.md | active | unknown | Jan | Jan | none |
| R11 | The mentor sets the price of the 25- and 50-minute session; commission is 10% on bookings through the mentor's link and 20% through the catalogue | pricing, payout | `[DOCUMENT]` research/decisions/D08-mentor-price-commission-by-channel.md | active | unknown | Jan | Jan | none |
| R12 | The mentor may decline a booked question before the session; the mentee gets a full refund | booking, refunds | `[DOCUMENT]` research/decisions/D09-instant-booking-mentor-may-decline.md | active | Q08 | Jan | Jan | none |
| R13 | A mentee has an account with a verified e-mail before booking a slot | sign-up, booking | `[DOCUMENT]` research/decisions/D12-mentee-account-before-booking.md | active | if A07 is refuted | Jan | Jan | none |
| R15 | Anyone may create a mentor account at the mentor sign-up page; invitations are links to it | mentor onboarding | `[DOCUMENT]` research/decisions/D14-open-mentor-sign-up.md | active | if unknown or low-quality mentors appear | Jan | Jan | none |
| R14 | A mentor's earnings after commission fall due once the session was held or the mentee did not show, and are paid out weekly | payout | `[DOCUMENT]` research/decisions/D13-payout-after-session-weekly.md | active | unknown | Jan | Jan | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Video calls | sessions are text; workshop constraint and "text is fine, faster" | founder A | active | unknown | superseding record by founder A | `[DOCUMENT]` research/decisions/N01-no-video.md | none |
| N02 | Ratings or reviews on mentor profiles | public work instead; rejected in three mentor-side interviews | founder A | active | unknown | superseding record by founder A | `[DOCUMENT]` research/decisions/N02-no-ratings.md | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-18 | The repository builds DevMentor; MentorHub material is superseded | lesson 04 course input; alternatives: separate folder, sub-folder | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D01-pivot-to-devmentor-scope.md | MentorHub intent draft 2026-10-17 |
| D02 | 2026-08-26 | Sessions are 25 or 50 minutes (R01) | "bookable in a lunch break" | founder A | active | unknown | founder A | `[DOCUMENT]` research/2026-08-26-workshop-export.md | none |
| D03 | 2026-08-26 | Nothing published without the mentee's approval (R02) | "trust is the product" | founders A and B | active | unknown | both founders | `[DOCUMENT]` research/2026-08-26-workshop-export.md | none |
| D04 | 2026-10-18 | First release: paid text sessions; vault and MCP later | accepted agent recommendation; alternatives vault first, both reduced | Jan | active | when sessions run | Jan | `[DOCUMENT]` research/decisions/D04-first-release-paid-text-sessions.md | none |
| D05 | 2026-10-18 | Booked slots with a visible earliest start, no time promise | accepted agent recommendation; alternatives on-demand, guaranteed time | Jan | active | when mentor availability is known (Q06) | Jan | `[DOCUMENT]` research/decisions/D05-scheduled-slots-earliest-start.md | none |
| D06 | 2026-10-18 | Share link plus an opt-in catalogue | Jan's own choice; alternatives link only, public catalogue | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D06-share-link-plus-opt-in-catalogue.md | none |
| D07 | 2026-10-18 | Free cancellation to 12 h; same-day refund on a mentor no-show (R06, R10) | accepted agent recommendation from Preply's rule and two interviews; alternatives 24 h, no cancellation | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D07-cancellation-12h-same-day-refund.md | none |
| D08 | 2026-10-18 | Mentor-set price; 10% via link, 20% via catalogue (R11) | accepted agent recommendation from Topmate's split; alternatives flat 20%, platform bands | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D08-mentor-price-commission-by-channel.md | none |
| D09 | 2026-10-18 | Booking confirmed on payment; mentor may decline with a full refund (R05, R12) | accepted agent recommendation; alternatives hold until accepted, no decline | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D09-instant-booking-mentor-may-decline.md | none |
| D10 | 2026-10-18 | Success measured on both sides: mentors publishing slots, paid sessions held | Jan's choice; thresholds and date not set | Jan | active | when thresholds are set (Q01) | Jan | `[DOCUMENT]` research/decisions/D10-success-measured-on-both-sides.md | none |
| D11 | 2026-10-18 | R03 and R07 become active rules | proposed from the freelancer and senior Python interviews; Jan approved both | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D11-price-first-and-payout-details-later.md | none |
| D12 | 2026-10-18 | Mentee account with verified e-mail before booking (R13) | Jan's choice against the agent's recommendation (e-mail at checkout); alternative account during checkout; conflicts with interview 2026-09-01 | Jan | active | if A07 is refuted | Jan | `[DOCUMENT]` research/decisions/D12-mentee-account-before-booking.md | none |
| D13 | 2026-10-18 | Earnings due after the session, weekly payout (R14) | accepted agent recommendation; alternatives at booking, monthly | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D13-payout-after-session-weekly.md | none |
| D14 | 2026-10-18 | Open mentor sign-up; invitations are links (R15) | Jan's choice at the E01 spec gate; alternative invitation-only as in the course backlog | Jan | active | if unknown mentors appear | Jan | `[DOCUMENT]` research/decisions/D14-open-mentor-sign-up.md | none |
| D15 | 2026-10-18 | The founders' 25-hour build limit does not bind this repository | course calendar is the constraint; Stripe-only and no-video stay on their own grounds | Jan | active | unknown | Jan | `[DOCUMENT]` research/decisions/D15-workshop-build-limit-not-binding.md | none |
| D16 | 2026-10-18 | Sign-in token rows kept 30 days | least personal data while Q05 has no owner; enough for a first A07 read | Jan | active | when Q05 is owned | Jan | `[DOCUMENT]` research/decisions/D16-auth-token-retention-30-days.md | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | A developer with a deadline pays for a scheduled text session `[ASSUMPTION]` founders' board | high | 37 of 54 said they would pay something; 3 have ever paid anyone; interviews give a shrug or "chyba" on price | D04 has no buyer | offer real paid slots from a few warm mentors in the Discord help channels for two weeks; count paid bookings, not stated intent | pending | unknown | untested |
| A02 | Enough mentors publish slots and join the catalogue `[ASSUMPTION]` | high | 29 of 50 listed mentors have a warm contact; nobody contacted yet; a staff engineer, asked about a month without bookings: "to zapomnę, że to istnieje" | catalogue stays empty for strangers | invite the first 20 warm contacts and count who publishes slots | pending | unknown | untested |
| A03 | Mentors have slots soon enough to matter before a deadline `[ASSUMPTION]` no material | high | availability not obtained in any mentor interview | D05 serves no urgent case | collection plan entry 1 | pending | unknown | untested |
| A04 | A mentor's share link brings mentees `[ASSUMPTION]` | medium | 16 of 50 listed mentors have their own audience; "jakbym coś z tego miał, to tak" | link-only mentors get no bookings | count bookings by source in the first weeks | pending | unknown | untested |
| A05 | Accounts from Polish-speaking interviewees hold for the English-speaking beachhead `[ASSUMPTION]` | medium | all seven interviews were held in Polish; the Discord is English-speaking | problems and price expectations differ | one interview with an English-speaking developer from the Discord | pending | unknown | untested |
| A06 | Employed developers can expense a session `[ASSUMPTION]` | low | 19 of 54 named the employer; one interviewee only pays when expensed | fewer buyers among the employed | ask in the A01 test who paid | pending | unknown | untested |
| A07 | A developer with a deadline completes sign-up with e-mail verification before booking `[ASSUMPTION]` | high | one interviewee named account setup and e-mail verification as a reason to leave (2026-09-01); no other material | D12 costs the urgent bookings D04 is for | count mentees who start sign-up from a mentor page and the share who book within the same visit | pending | unknown | untested |

## Kill criteria

Measures chosen (D10): mentors publishing slots and getting a first booking, and paid sessions held. The threshold below which the team stops or revises, and the date, are not set (Q01).

## Hypotheses to test

None; no synthetic walkthrough has been run.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Which thresholds and date for the D10 measures count as success, and below what do we stop? | no for the backlog; yes for kill criteria | Jan | open (measures chosen in D10) |
| Q02 | Cancellation and reschedule: until when free, and who gets what after that? | — | Jan | closed by D07 |
| Q03 | Who sets the price (mentor or platform) and what is the platform's cut? | — | Jan | closed by D08 |
| Q04 | Does the mentor accept or decline a question before the booking is confirmed? | — | Jan | closed by D09 |
| Q05 | Who owns terms of service and data processing while legal has nobody? | yes — before release, not before build | Jan | open |
| Q06 | How many hours a week will mentors give, and how soon can they start? | no — informs D05 and A03 | mentors on the invitation list | open |
| Q07 | When are `docs/discovery/` and `docs/sdlc/intent.md` updated to the DevMentor scope? | no | Jan | open |
| Q08 | By when before the session must a mentor decline (R12)? | no — the decline story can ship with a proposed limit | Jan | open |

## Definition of Ready addendum (own)

Problems and Target group rest on three developer accounts and one Discord export, all from the founders' network; the mentor side rests on three interviews. That supports building the first release scope, not a demand claim. Decisions D04–D16 are agreed and no open question blocks the Now stories. A01 is untested; Jan chose to keep it for a test rather than accept it untested, so building proceeds without evidence that developers pay. The commission rates (D08) and the 12-hour window (D07) are chosen policy, not tested with users.

## Collection plan

### How many hours a week will mentors give, and how soon can a booking start?

- What decision or work needs it: whether D05's earliest start serves anyone with a deadline (A03, Q06)
- Who can answer it: senior engineers from the invitation list with a warm contact
- How: short interviews when the first invitations go out
- Owner and by when: unknown
- Template: `.ai/specs/research/templates/interview-note.md`
