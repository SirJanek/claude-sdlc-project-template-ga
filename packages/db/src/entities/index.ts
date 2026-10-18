import { AuthToken } from './auth/auth-token.entity';
import { User } from './auth/user.entity';

export { User, USER_ROLES, type UserRole } from './auth/user.entity';
export { AuthToken, TOKEN_INTENT_ROLES, type TokenIntentRole } from './auth/auth-token.entity';
export { baseProperties } from './base.entity';

/** Every entity, registered explicitly (no folder scanning). */
export const entities = [User, AuthToken];
