import {
  makeCrudRoute,
  requireRole,
  requireSession,
  userCreateSchema,
  type UserCreateInput,
  type UserService,
} from '@mentorhub/core';

// Reference example for every concept: the route file is configuration, not logic.
// Admin only: a session cookie (or the local dev admin) with the admin role; fails closed.
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT, DELETE } = makeCrudRoute<UserService, UserCreateInput>({
  service: (cradle) => cradle.userService,
  authorize: async (request) => {
    requireRole(await requireSession(request), 'admin');
  },
  list: (service) => service.list(),
  create: { schema: userCreateSchema, run: (service, input) => service.create(input) },
});
