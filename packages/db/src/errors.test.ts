import { describe, expect, it } from 'vitest';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { isUniqueViolation } from './errors';

describe('isUniqueViolation', () => {
  it('recognises a unique-constraint violation', () => {
    expect(isUniqueViolation(new UniqueConstraintViolationException(new Error('duplicate key')))).toBe(true);
  });

  it('rejects other errors and non-errors', () => {
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
    expect(isUniqueViolation('duplicate key')).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
