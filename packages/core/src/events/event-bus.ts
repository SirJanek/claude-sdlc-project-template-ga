import type { Logger } from 'pino';
import type { EventId, EventMap } from './events';

export type EventHandler<E extends EventId> = (payload: EventMap[E]) => void | Promise<void>;

/**
 * Typed in-process event bus (a deliberate stateful singleton: the handler registry). No queue, no
 * persistence. A throwing or rejecting handler is logged and swallowed, so a subscriber can never
 * fail the request that emitted the event or stop the other subscribers.
 */
export class EventBus {
  private readonly logger: Logger;
  private readonly handlers = new Map<EventId, Set<EventHandler<never>>>();

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  /** Registers a handler; returns the function that removes it again. */
  on<E extends EventId>(event: E, handler: EventHandler<E>): () => void {
    const registered = this.handlers.get(event) ?? new Set<EventHandler<never>>();
    registered.add(handler as EventHandler<never>);
    this.handlers.set(event, registered);
    return () => {
      registered.delete(handler as EventHandler<never>);
    };
  }

  /** Runs the handlers registered right now, in registration order, awaiting each. */
  async emit<E extends EventId>(event: E, payload: EventMap[E]): Promise<void> {
    for (const handler of [...(this.handlers.get(event) ?? [])]) {
      try {
        await (handler as EventHandler<E>)(payload);
      } catch (err) {
        this.logger.error({ err, event }, 'event handler failed');
      }
    }
  }
}
