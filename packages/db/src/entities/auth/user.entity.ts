import { defineEntity, p } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';

export const USER_ROLES = ['mentee', 'mentor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const UserSchema = defineEntity({
  name: 'User',
  tableName: 'users',
  properties: {
    ...baseProperties,
    email: p.string().length(320).unique(),
    /** Null until the person gives it (mentor profile setup, mentee's first booking) — grill-me Q5/Q12. */
    name: p.string().length(120).strictNullable(),
    role: p.enum(USER_ROLES).default('mentee'),
    /** Set by an e-mail-link click or a verified GitHub e-mail; admin-created rows stay null. */
    emailVerifiedAt: p.datetime().strictNullable(),
    /** GitHub numeric id as text (Phase 2). */
    githubId: p.string().length(32).strictNullable().unique(),
    /** Bumped on "sign out everywhere" and on a role change; a JWT whose `sv` differs is rejected. */
    sessionVersion: p.integer().default(0),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
