import { User, type EntityManager, type UserRole } from '@mentorhub/db';

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface UserService {
  list(limit?: number): Promise<UserListItem[]>;
}

/** Request-scoped: receives the EntityManager fork of the current request. */
export function makeUserService({ em }: { em: EntityManager }): UserService {
  return {
    async list(limit = 50) {
      const users = await em.find(User, {}, { orderBy: { createdAt: 'desc' }, limit });
      return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      }));
    },
  };
}
