import { describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@mentorhub/db';
import { ConflictError } from '../../http/errors';
import { UserService } from './user.service';

// core never imports @mikro-orm/*: a stand-in violation, recognised by a stubbed isUniqueViolation.
class UniqueViolation extends Error {}
vi.mock('@mentorhub/db', async (original) => ({
  ...(await original<typeof import('@mentorhub/db')>()),
  isUniqueViolation: (error: unknown) => error instanceof UniqueViolation,
}));

const bus = () => ({ emit: vi.fn(async () => {}) });

/** Fake EM over a shared "table": create() builds a pending row, flush() enforces the unique email. */
function fakeTable() {
  const rows: { email: string }[] = [];
  const em = () => {
    let pending: { id?: string; email: string; name: string; role: string; createdAt?: Date } | undefined;
    return {
      create: (_entity: unknown, data: { email: string; name: string; role: string }) => (pending = { ...data }),
      flush: async () => {
        await Promise.resolve();
        if (rows.some((r) => r.email === pending!.email)) {
          throw new UniqueViolation('duplicate key');
        }
        rows.push(pending!);
        Object.assign(pending!, { id: `id-${rows.length}`, createdAt: new Date('2026-10-18T10:00:00Z') });
      },
    } as unknown as EntityManager;
  };
  return { rows, em };
}

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
    const users = await new UserService({ em, eventBus: bus() as never }).list();
    expect(users).toEqual([
      { id: 'u1', email: 'a@x.io', name: 'Ann', role: 'mentor', createdAt: '2026-10-18T10:00:00.000Z' },
    ]);
    expect(calls[0]).toMatchObject([expect.anything(), {}, { orderBy: { createdAt: 'desc' }, limit: 50 }]);
  });

  describe('create', () => {
    const input = { email: 'ann@example.com', name: 'Ann', role: 'mentor' as const };

    it('persists, returns the list shape and emits auth.user.created once, after the flush', async () => {
      const { em, rows } = fakeTable();
      const eventBus = bus();
      eventBus.emit.mockImplementation(async () => {
        expect(rows).toHaveLength(1); // the row was flushed before the event
      });
      const created = await new UserService({ em: em(), eventBus: eventBus as never }).create(input);
      expect(created).toEqual({
        id: 'id-1',
        email: 'ann@example.com',
        name: 'Ann',
        role: 'mentor',
        createdAt: '2026-10-18T10:00:00.000Z',
      });
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledWith('auth.user.created', { userId: 'id-1', email: 'ann@example.com' });
    });

    it('maps a unique violation to ConflictError and emits nothing', async () => {
      const { em } = fakeTable();
      const eventBus = bus();
      await new UserService({ em: em(), eventBus: eventBus as never }).create(input);
      eventBus.emit.mockClear();
      await expect(new UserService({ em: em(), eventBus: eventBus as never }).create(input)).rejects.toThrow(
        new ConflictError('A user with this email already exists.'),
      );
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('two concurrent creates of one email: one user, one conflict, exactly one event', async () => {
      const { em } = fakeTable();
      const eventBus = bus();
      const results = await Promise.allSettled([
        new UserService({ em: em(), eventBus: eventBus as never }).create(input),
        new UserService({ em: em(), eventBus: eventBus as never }).create(input),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
    });

    it('rethrows any other database error untouched and emits nothing', async () => {
      const failure = new Error('connection lost');
      const em = { create: () => ({}), flush: async () => Promise.reject(failure) } as unknown as EntityManager;
      const eventBus = bus();
      await expect(new UserService({ em, eventBus: eventBus as never }).create(input)).rejects.toBe(failure);
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });
});
