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
    name: p.string().length(120),
    role: p.enum(USER_ROLES).default('mentee'),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
