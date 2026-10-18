import { describe, expect, it } from 'vitest';
import { baseProperties } from './base.entity';

type Options = { '~options': { onCreate?: () => unknown; onUpdate?: () => unknown; primary?: boolean } };
const opts = (prop: unknown) => (prop as Options)['~options'];

describe('baseProperties', () => {
  it('generates a UUID primary key on create (no enumerable ids)', () => {
    const id = opts(baseProperties.id);
    expect(id.primary).toBe(true);
    const value = id.onCreate?.();
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id.onCreate?.()).not.toBe(value);
  });

  it('stamps createdAt on create and updatedAt on create and update', () => {
    for (const fn of [
      opts(baseProperties.createdAt).onCreate,
      opts(baseProperties.updatedAt).onCreate,
      opts(baseProperties.updatedAt).onUpdate,
    ]) {
      expect(fn?.()).toBeInstanceOf(Date);
    }
  });
});
