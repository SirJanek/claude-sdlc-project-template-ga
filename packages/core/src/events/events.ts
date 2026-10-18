/**
 * Every domain event, by ID (`concept.entity.action`, past tense) → payload. Adding an event is one
 * line here; emitters and subscribers are then checked against it at compile time.
 */
export interface EventMap {
  /** `method`: how the account came to exist — a sign-in link, a verified GitHub e-mail, or an admin. */
  'auth.user.created': { userId: string; email: string; method: 'email' | 'github' | 'admin' };
}

export type EventId = keyof EventMap;
