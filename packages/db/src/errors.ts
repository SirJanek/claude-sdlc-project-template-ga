import { UniqueConstraintViolationException } from '@mikro-orm/core';

/**
 * True when the database rejected a write because of a unique index. Class-level on purpose: the
 * caller knows which constraint it just wrote (users has one besides the PK, `email`).
 */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof UniqueConstraintViolationException;
}
