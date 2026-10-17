import { makeCrudRoute, type UserService } from '@mentorhub/core';

// Reference example for every concept: the route file is configuration, not logic.
// Guarded by requireSession (dev-admin flag until the auth spec lands; fails closed).
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT, DELETE } = makeCrudRoute<UserService>({
  service: (cradle) => cradle.userService,
  list: (service) => service.list(),
});
