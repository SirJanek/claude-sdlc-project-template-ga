import { defineEntity, p } from '@mikro-orm/core';

export const USER_ROLES = ['mentee', 'mentor', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const UserSchema = defineEntity({
  name: 'User',
  tableName: 'user',
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => crypto.randomUUID()),
    email: p.string().length(320).unique(),
    name: p.string().length(120),
    role: p.enum(USER_ROLES).default('mentee'),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
