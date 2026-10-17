import { p } from '@mikro-orm/core';

/** Columns every entity shares: UUID primary key (no enumerable ids) and audit timestamps. */
export const baseProperties = {
  id: p
    .uuid()
    .primary()
    .onCreate(() => crypto.randomUUID()),
  createdAt: p.datetime().onCreate(() => new Date()),
  updatedAt: p
    .datetime()
    .onCreate(() => new Date())
    .onUpdate(() => new Date()),
};
