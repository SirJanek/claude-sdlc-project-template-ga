import { defineEntity, p } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';

export const TOKEN_INTENT_ROLES = ['mentee', 'mentor'] as const;
export type TokenIntentRole = (typeof TOKEN_INTENT_ROLES)[number];

/**
 * One-time e-mail sign-in link (spec: accounts and roles › Data Model). The raw token exists only in
 * the e-mail; the row keeps its SHA-256. No FK to users: the person may not have an account yet.
 * Rows are kept 30 days (A07 measurement), then deleted by the next token creation.
 */
const AuthTokenSchema = defineEntity({
  name: 'AuthToken',
  tableName: 'auth_tokens',
  properties: {
    ...baseProperties,
    /** Lower-cased. Indexed for the per-e-mail rate-limit count. */
    email: p.string().length(320).index(),
    tokenHash: p.string().columnType('char(64)').unique(),
    /** Role for a NEW account only; never changes an existing one. */
    intentRole: p.enum(TOKEN_INTENT_ROLES).strictNullable(),
    /** Validated same-origin return path. */
    nextPath: p.string().length(512).strictNullable(),
    /** SHA-256(IP + AUTH_SECRET) for the per-IP rate-limit count; no raw IP stored. Indexed. */
    ipHash: p.string().columnType('char(64)').index(),
    expiresAt: p.datetime(),
    /** Set when consumed, or when the e-mail could not be sent (dead token). */
    usedAt: p.datetime().strictNullable(),
  },
});

export class AuthToken extends AuthTokenSchema.class {}
AuthTokenSchema.setClass(AuthToken);
