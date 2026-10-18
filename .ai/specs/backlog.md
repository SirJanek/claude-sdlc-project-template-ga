# Backlog

One section per backlog source. The tracker is the live authority; this file keeps the source-to-issue map and reserved ids.

## Backlog source: .ai/specs/product-brief.md

Filed 2026-10-18 by `om-backlog`, tree confirmed by Jan. Repository: [SirJanek/claude-sdlc-project-template-ga](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues). Labels applied by `om-prepare-issue` (category, priority, risk) with a label-rationale comment on each issue.

| Id | Issue | Title | Priority | Risk | Depends on |
|---|---|---|---|---|---|
| E01 | [#20](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/20) | Accounts and roles | medium | high | — |
| E01-S01 | [#26](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/26) | A mentor can create an account and reach profile setup without giving payout details | medium | high | none |
| E01-S02 | [#27](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/27) | A mentee can create an account with a verified e-mail before booking | medium | high | none |
| E02 | [#21](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/21) | Mentors become bookable | medium | high | — |
| E02-S01 | [#28](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/28) | A mentor can publish a profile with a link to public work and no scores | medium | medium | E01-S01 |
| E02-S02 | [#29](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/29) | A mentor can set prices for 25- and 50-minute sessions and publish slots | medium | high | E02-S01 |
| E02-S03 | [#30](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/30) | A mentee opening a mentor's link sees profile, price and earliest start before writing anything | medium | medium | E02-S02 |
| E02-S04 | [#31](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/31) | A mentor can choose to join the catalogue, and a mentee can find opted-in mentors | medium | medium | E02-S02 |
| E03 | [#22](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/22) | Booking and payment | medium | high | — |
| E03-S01 | [#32](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/32) | A mentee can book a slot, write the question and pay; the booking is confirmed on payment | medium | high | E01-S02, E02-S03 |
| E03-S01-T01 | [#39](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/39) | Stripe integration: charge, refund and commission split by channel | medium | high | — |
| E03-S02 | [#34](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/34) | A mentor can decline a booked question before the session; the mentee gets a full refund | medium | high | E03-S01 |
| E03-S03 | [#35](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/35) | A mentee can cancel or reschedule free until 12 hours before the session | medium | high | E03-S01 |
| E03-S04 | [#36](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/36) | No-shows: same-day refund when the mentor does not show, payment to the mentor when the mentee does not | medium | high | E03-S01, E04-S01 |
| E03-S05 | [#37](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/37) | A mentor with a first booking can add payout details and is paid weekly after held sessions | medium | high | E03-S01, E04-S01 |
| E03-S05-T01 | [#40](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/40) | Weekly payout job and Stripe payouts to mentors | medium | high | — |
| E04 | [#23](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/23) | Text session | medium | high | — |
| E04-S01 | [#33](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/33) | Mentor and mentee hold the session over text at the booked time, visible only to them | medium | high | E03-S01 |
| E05 | [#24](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/24) | First-release measures | medium | high | — |
| E05-S01 | [#38](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/38) | An admin can see mentors with published slots and a first booking, and paid sessions held, for a chosen period | medium | high | E02-S02, E03-S01, E04-S01 |
| E06 | [#25](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/25) | Later (parked) | low | low | — |

External reference (not adopted): [#17](https://github.com/SirJanek/claude-sdlc-project-template-ga/issues/17) admin shell and Dashboard, closed — E05 builds on it.

Reserved ids: E01–E06 and the story and task ids above. None retired.

Start with **E01-S01** (#26): nothing blocks it and the whole mentor path (E02) depends on it.
