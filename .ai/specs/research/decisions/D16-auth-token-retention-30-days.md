# D16 — Sign-in token rows are kept 30 days
- Date, owner: 2026-10-18, Jan (grill-me Q9)
- Context and the options weighed: the E01 spec keeps `auth_tokens` rows as data for A07 (sign-up friction). They hold e-mail addresses, including those of people who never created an account. Options: 30 days, 90 days, 90 days with the e-mail hashed after expiry.
- Decision and why: 30 days. Enough for the first A07 read; the least personal data while terms and data processing (Q05) still have no owner.
- Consequences, and what would make us revisit it: a longer A07 measurement would need aggregates stored elsewhere (E05) rather than longer retention.
- Status: active
