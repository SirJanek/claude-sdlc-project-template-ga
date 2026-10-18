import { isUniqueViolation, User, type EntityManager, type UserRole } from '@mentorhub/db';
import type { EventBus } from '../../events/event-bus';
import { ConflictError } from '../../http/errors';
import type { UserCreateInput } from '../../validators/auth/user-create.schema';

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

const DEFAULT_LIST_LIMIT = 50;

function toListItem(user: User): UserListItem {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Users concept (auth). Request-scoped: owns the request's EntityManager fork. */
export class UserService {
  private readonly em: EntityManager;
  private readonly eventBus: EventBus;

  constructor({ em, eventBus }: { em: EntityManager; eventBus: EventBus }) {
    this.em = em;
    this.eventBus = eventBus;
  }

  async list(): Promise<UserListItem[]> {
    const users = await this.em.find(User, {}, { orderBy: { createdAt: 'desc' }, limit: DEFAULT_LIST_LIMIT });
    return users.map(toListItem);
  }

  /** Persists the user, then emits `auth.user.created` — never for a create that failed. */
  async create(input: UserCreateInput): Promise<UserListItem> {
    const user = this.em.create(User, input);
    try {
      await this.em.flush();
    } catch (error) {
      // users has exactly one unique constraint besides the PK: email. Revisit if another is added.
      if (isUniqueViolation(error)) throw new ConflictError('A user with this email already exists.');
      throw error;
    }
    await this.eventBus.emit('auth.user.created', { userId: user.id, email: user.email });
    return toListItem(user);
  }
}
