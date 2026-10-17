import { User, type EntityManager, type UserRole } from '@mentorhub/db';

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

const DEFAULT_LIST_LIMIT = 50;

/** Users concept (auth). Request-scoped: owns the request's EntityManager fork. */
export class UserService {
  private readonly em: EntityManager;

  constructor({ em }: { em: EntityManager }) {
    this.em = em;
  }

  async list(): Promise<UserListItem[]> {
    const users = await this.em.find(User, {}, { orderBy: { createdAt: 'desc' }, limit: DEFAULT_LIST_LIMIT });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }));
  }
}
