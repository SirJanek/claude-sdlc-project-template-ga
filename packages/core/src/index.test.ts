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
      'HealthService',
      'AppError',
      'apiHandler',
      'makeCrudRoute',
      'requireSession',
      'requireRole',
      'REQUEST_HEADER',
    ]) {
      expect(core, name).toHaveProperty(name);
    }
  });
});
