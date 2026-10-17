import { describe, expect, it } from 'vitest';
import type { EntityManager } from '@mentorhub/db';
import { UserService } from './user.service';

describe('UserService', () => {
  it('lists users newest first as plain DTOs with ISO dates', async () => {
    const calls: unknown[] = [];
    const em = {
      find: async (...args: unknown[]) => {
        calls.push(args);
        return [
          { id: 'u1', email: 'a@x.io', name: 'Ann', role: 'mentor', createdAt: new Date('2026-10-18T10:00:00Z') },
        ];
      },
    } as unknown as EntityManager;
    const users = await new UserService({ em }).list();
    expect(users).toEqual([
      { id: 'u1', email: 'a@x.io', name: 'Ann', role: 'mentor', createdAt: '2026-10-18T10:00:00.000Z' },
    ]);
    expect(calls[0]).toMatchObject([expect.anything(), {}, { orderBy: { createdAt: 'desc' }, limit: 50 }]);
  });
});
