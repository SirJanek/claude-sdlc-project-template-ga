import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger';
import { EventBus } from './event-bus';
import { registerEventSubscribers } from './subscribers';

const payload = { userId: 'u1', email: 'ann@example.com', method: 'admin' as const };

function captureLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = createLogger({
    destination: { write: (line: string) => void lines.push(JSON.parse(line) as Record<string, unknown>) },
  });
  return { logger, lines };
}

describe('EventBus', () => {
  it('runs handlers in registration order, awaiting each, with the payload', async () => {
    const bus = new EventBus({ logger: createLogger({ level: 'silent' }) });
    const calls: string[] = [];
    bus.on('auth.user.created', async (p) => {
      await Promise.resolve();
      calls.push(`first:${p.userId}`);
    });
    bus.on('auth.user.created', (p) => void calls.push(`second:${p.email}`));
    await bus.emit('auth.user.created', payload);
    expect(calls).toEqual(['first:u1', 'second:ann@example.com']);
  });

  it('resolves immediately when nobody listens', async () => {
    const bus = new EventBus({ logger: createLogger({ level: 'silent' }) });
    await expect(bus.emit('auth.user.created', payload)).resolves.toBeUndefined();
  });

  it('unsubscribes, and an unsubscribe during emit applies to the next emit only', async () => {
    const bus = new EventBus({ logger: createLogger({ level: 'silent' }) });
    const later = vi.fn();
    const off = bus.on('auth.user.created', () => off2());
    const off2 = bus.on('auth.user.created', later);
    await bus.emit('auth.user.created', payload);
    expect(later).toHaveBeenCalledTimes(1);
    await bus.emit('auth.user.created', payload);
    expect(later).toHaveBeenCalledTimes(1);
    off();
  });

  it('logs and swallows a throwing and a rejecting handler, and still runs the others', async () => {
    const { logger, lines } = captureLogger();
    const bus = new EventBus({ logger });
    const after = vi.fn();
    bus.on('auth.user.created', () => {
      throw new Error('sync boom');
    });
    bus.on('auth.user.created', () => Promise.reject(new Error('async boom')));
    bus.on('auth.user.created', after);
    await expect(bus.emit('auth.user.created', payload)).resolves.toBeUndefined();
    expect(after).toHaveBeenCalledWith(payload);
    const failures = lines.filter((l) => l.msg === 'event handler failed');
    expect(failures).toHaveLength(2);
    expect(failures[0]).toMatchObject({ event: 'auth.user.created', level: 50 });
  });
});

describe('registerEventSubscribers', () => {
  it('logs auth.user.created with the userId but never the plain email', async () => {
    const { logger, lines } = captureLogger();
    const bus = new EventBus({ logger });
    registerEventSubscribers({ eventBus: bus, logger });
    await bus.emit('auth.user.created', payload);
    const line = lines.find((l) => l.msg === 'domain event');
    expect(line).toMatchObject({ event: 'auth.user.created', payload: { userId: 'u1', email: '[redacted]' } });
    expect(JSON.stringify(lines)).not.toContain('ann@example.com');
  });
});
