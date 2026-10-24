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
export { getEnv, parseEnv, isGitHubEnabled, AUTH_SECRET_MIN_LENGTH, TEST_AUTH_SECRET, type Env } from './config/env';
export { getLogger, createLogger, REDACTED_PATHS } from './logger';
export type { Cradle } from './container/cradle';
export { buildContainer, getContainer, createRequestScope, withScope, type AppContainer } from './container/container';
export { EventBus, type EventHandler } from './events/event-bus';
export type { EventMap, EventId } from './events/events';
export { userCreateSchema, type UserCreateInput } from './validators/auth/user-create.schema';
export {
  emailLinkStartSchema,
  intentRoleSchema,
  type EmailLinkStartInput,
  type IntentRole,
} from './validators/auth/email-link-start.schema';
export { accountNoticeSchema, ACCOUNT_NOTICE_PARAM, type AccountNotice } from './validators/auth/account-notice.schema';
export { emailLinkConsumeSchema, type EmailLinkConsumeInput } from './validators/auth/email-link-consume.schema';
export { signOutSchema, type SignOutInput } from './validators/auth/sign-out.schema';
export { nextPathSchema } from './validators/auth/next-path.schema';
export { UserService, type UserListItem } from './services/auth/user.service';
export {
  AuthService,
  DEV_ADMIN_USER,
  type EmailLinkRequest,
  type ConsumedLink,
  type GitHubSignIn,
  type GitHubSignInIntent,
  type CurrentUser,
} from './services/auth/auth.service';
export { MENTOR_PROFILE_PATH, defaultLandingPath, withAccountNotice } from './services/auth/landing-path';
export {
  GitHubSignInService,
  GITHUB_ERROR,
  githubStartSchema,
  type RedirectOutcome,
} from './services/auth/github-sign-in.service';
export { GitHubClientError, type GitHubClient, type GitHubUser } from './services/github/github-client.port';
export {
  FakeGitHubClient,
  FAKE_GITHUB_CODE,
  DEFAULT_FAKE_GITHUB_USER,
  fakeGitHubScenarioSchema,
  type FakeGitHubScenario,
} from './services/github/adapters/fake-github-client';
export { ArcticGitHubClient, GITHUB_CALLBACK_PATH } from './services/github/adapters/arctic-github-client';
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
  GitHubEmailUnverifiedError,
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
  readCookie,
  buildCookie,
  type SessionClaims,
} from './http/session';
export {
  GITHUB_STATE_COOKIE,
  GITHUB_STATE_COOKIE_PATH,
  signGitHubStateToken,
  verifyGitHubStateToken,
  buildGitHubStateCookie,
  clearGitHubStateCookie,
  readGitHubStateCookie,
  type GitHubStateClaims,
} from './http/github-state';
export { redirectResponse } from './http/redirect';
export { pageAccess, type PageAccess, type PageAccessDeps } from './http/page-access';
export { readJsonBody } from './http/body';
export { readClientIp, UNKNOWN_IP } from './http/client-ip';
