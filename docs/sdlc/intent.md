<!--
STAGE 1 — Plan. Written with /sdlc-intent, accepted and committed by the product owner.
Describes a PROBLEM. If a solution appears below, it belongs in spec.md instead.

DRAFT NOTE (2026-10-17): drafted from the discovery package in docs/discovery/, not from an
/sdlc-intent interview. The interview questions that discovery did not answer are carried
into Open questions unresolved. The product owner runs /sdlc-intent (or edits directly),
resolves what they can, and flips Status to accepted.
-->

# Intent: MentorHub — access to practitioner mentoring

**Status:** draft · **Owner:** Jan (product owner) · **Date:** 2026-10-17

## Problem

People growing a career in product, engineering, AI and UX (2–10 years in) cannot easily get
regular, paid 1:1 time with a practitioner who has already done the job they are aiming for.
Today they cold-message people on LinkedIn, ask colleagues, or buy ad-hoc calls arranged by
email — and before paying they cannot judge fit, see a price, or see free times.

Experienced practitioners who would mentor for money carry the whole overhead themselves:
finding mentees, agreeing times by email, invoicing, chasing payments and no-shows. Many do
not mentor at all because of that overhead.

Neither side is protected when a session goes wrong (no-show, poor quality, payment dispute):
there is no neutral record of what happened and no agreed refund rule.

## Desired outcome

Candidate measures from discovery — **targets are not set yet** (see Open questions):

- A first-time visitor can find a relevant mentor and book a first session without contacting
  anyone (time to first booking: target TBD).
- Share of first sessions that turn into recurring sessions (intro → plan conversion: target TBD).
- Mentors spend no time on scheduling, invoicing or payment collection outside the product.
- Every dispute is decided on recorded evidence within an agreed time (target TBD).
- Course milestone: the core path "find → book → pay → meet → review" works end to end by
  2026-11-13.

## Affected users

| Role | What they do today instead |
|---|---|
| Mentee (career professional, 2–10 yrs) | LinkedIn cold outreach, asking colleagues, paid ad-hoc calls via email; no way to compare mentors or judge fit before paying |
| Mentor (practitioner, 5–20 yrs) | Arranges times, invoices and chases payments by hand, or does not mentor |
| Visitor (not yet registered) | Cannot see price, availability or evidence of quality without contacting someone |
| Operations / Trust & Safety admin | Role does not exist yet; quality of mentors and fairness of disputes have no owner |
| Sponsor / HR (company paying for staff) | Reimburses ad-hoc invoices; deliberately out of scope for MVP |

## Constraints

| Constraint | Hard or assumed |
|---|---|
| Course timeline: delivered as the AI Tech Leaders project, 2026-10-12 → 2026-11-13 | hard |
| Process: AI-native SDLC in this repo (intent → spec → plan → PR) | hard |
| Preply.com is a functional/UX benchmark only; no copying of visual identity, copy or code | hard |
| Product UI in English | hard |
| Personal data under GDPR (EU users); card data never stored by us (PCI-DSS via a payment provider) | hard |
| Currency USD | assumed |
| 1:1 video sessions only (no groups, no async courses) | assumed |

Product rules proposed in discovery (intro session, weekly plans on credits, 12-hour
reschedule rule, fee tiers, payout terms, contact-detail blocking) are **solutions**, not
constraints. They are listed with their parameters in `docs/discovery/02-Use-case-i-przeplywy.md`
and are decided in `spec.md`.

## Open questions

Carried unresolved. Business questions from discovery (`docs/discovery/02-Use-case-i-przeplywy.md`):

- [ ] Currency and tax: USD, PLN or EUR? VAT OSS? — product owner, accountant
- [ ] Is the intro session paid (as in the prototype) or free (higher no-show risk)? — product owner
- [ ] Fee model: tiered by hours taught, or a flat percentage? — product owner
- [ ] Who invoices the mentee: the platform (agency model) or the mentor (marketplace model)? — product owner, legal

Interview questions that discovery did not answer:

- [ ] How often does the problem occur for a mentee, and what does each occurrence cost them (time, money, a missed promotion)? — product owner, mentee interviews (course L04)
- [ ] What happens if nothing is built for a quarter — who loses what? — product owner
- [ ] Which numeric targets define success for each Desired outcome bullet? — product owner
- [ ] Is this a course exercise only, or intended to run with real users and money? It changes which "assumed" constraints become hard. — product owner
- [ ] Who has to agree before anything ships (course reviewers, legal, payment provider onboarding)? — product owner
- [ ] What would make this a failure even if it shipped on time? — product owner

## Out of scope

- Company-sponsored plans (B2B budgets, HR dashboards, consolidated invoices)
- Group sessions, courses, recorded content, marketplace for materials
- Native mobile apps (responsive web only)
- Two-factor authentication beyond a placeholder
- Choosing the tech stack and vendors (payment, video, KYC) — that is spec.md / plan.md work
