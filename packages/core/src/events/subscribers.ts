import type { Logger } from 'pino';
import type { EventBus } from './event-bus';

/** Wires the in-process subscribers; called once per container. Log only until a notification port exists. */
export function registerEventSubscribers({ eventBus, logger }: { eventBus: EventBus; logger: Logger }): void {
  eventBus.on('auth.user.created', (payload) => {
    // The logger redacts `email` (REDACTED_PATHS); `userId` stays for correlation.
    logger.info({ event: 'auth.user.created', payload }, 'domain event');
  });
}
