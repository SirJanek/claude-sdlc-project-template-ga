import { describe, expect, it } from 'vitest';
import * as core from './index';

describe('@mentorhub/core public API', () => {
  it('exposes rules, config, container, services and the http layer', () => {
    for (const name of [
      'RULES',
      'introPrice',
      'getEnv',
      'parseEnv',
      'getLogger',
      'buildContainer',
      'withScope',
      'UserService',
      'EventBus',
      'userCreateSchema',
      'HealthService',
      'AppError',
      'apiHandler',
      'envelope',
      'makeCrudRoute',
      'requireSession',
      'requireRole',
      'REQUEST_HEADER',
      'AUTH_LIMITS',
      'AuthService',
      'MockMailSender',
      'emailLinkStartSchema',
      'emailLinkConsumeSchema',
      'signOutSchema',
      'nextPathSchema',
      'SESSION_COOKIE',
      'signSessionToken',
      'verifySessionToken',
      'buildSessionCookie',
      'clearSessionCookie',
      'readSessionCookie',
      'readJsonBody',
      'readClientIp',
      'GoneError',
      'RateLimitedError',
      'ServiceUnavailableError',
    ]) {
      expect(core, name).toHaveProperty(name);
    }
  });
});
