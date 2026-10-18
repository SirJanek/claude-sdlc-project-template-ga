import {
  makeCrudRoute,
  requireRole,
  requireSession,
  userCreateSchema,
  type UserCreateInput,
  type UserService,
} from '@mentorhub/core';

// Reference example for every concept: the route file is configuration, not logic.
// Admin only. Guarded by requireSession (dev-admin flag until the auth spec lands; fails closed).
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT, DELETE } = makeCrudRoute<UserService, UserCreateInput>({
  service: (cradle) => cradle.userService,
  authorize: (request) => {
    requireRole(requireSession(request), 'admin');
  },
  list: (service) => service.list(),
  create: { schema: userCreateSchema, run: (service, input) => service.create(input) },
});
