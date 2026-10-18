export {
  RULES,
  AUTH_LIMITS,
  type Rules,
  type AuthLimits,
  sessionPrice,
  introPrice,
  isFreeCancellation,
  isBookable,
  platformFeePercent,
} from './config/rules';
export { getEnv, parseEnv, AUTH_SECRET_MIN_LENGTH, TEST_AUTH_SECRET, type Env } from './config/env';
export { getLogger, createLogger, REDACTED_PATHS } from './logger';
export type { Cradle } from './container/cradle';
export { buildContainer, getContainer, createRequestScope, withScope, type AppContainer } from './container/container';
export { EventBus, type EventHandler } from './events/event-bus';
export type { EventMap, EventId } from './events/events';
export { userCreateSchema, type UserCreateInput } from './validators/auth/user-create.schema';
export { emailLinkStartSchema, type EmailLinkStartInput } from './validators/auth/email-link-start.schema';
export { emailLinkConsumeSchema, type EmailLinkConsumeInput } from './validators/auth/email-link-consume.schema';
export { signOutSchema, type SignOutInput } from './validators/auth/sign-out.schema';
export { nextPathSchema } from './validators/auth/next-path.schema';
export { UserService, type UserListItem } from './services/auth/user.service';
export {
  AuthService,
  DEV_ADMIN_USER,
  type EmailLinkRequest,
  type ConsumedLink,
  type CurrentUser,
} from './services/auth/auth.service';
export type { MailSender, MailMessage } from './services/mail/mail-sender.port';
export { MockMailSender } from './services/mail/adapters/mock-mail-sender';
export { HealthService, type HealthReport } from './services/health/health.service';
export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  ConflictError,
  GoneError,
  RateLimitedError,
  ServiceUnavailableError,
  type FieldErrors,
} from './http/errors';
export {
  apiHandler,
  envelope,
  REQUEST_HEADER,
  type ApiEnvelope,
  type RouteContext,
  type RouteHandler,
} from './http/apiHandler';
export { makeCrudRoute, type CrudRouteConfig } from './http/makeCrudRoute';
export {
  requireSession,
  requireRole,
  DEV_ADMIN_SESSION,
  type Session,
  type SessionUser,
  type SessionUserLookup,
  type RequireSessionDeps,
} from './http/auth';
export {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
  buildSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  type SessionClaims,
} from './http/session';
export { readJsonBody } from './http/body';
export { readClientIp, UNKNOWN_IP } from './http/client-ip';
