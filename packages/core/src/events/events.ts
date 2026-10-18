/**
 * Every domain event, by ID (`concept.entity.action`, past tense) → payload. Adding an event is one
 * line here; emitters and subscribers are then checked against it at compile time.
 */
export interface EventMap {
  'auth.user.created': { userId: string; email: string };
}

export type EventId = keyof EventMap;
