// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const getEnv = vi.hoisted(() => vi.fn());
vi.mock('@mentorhub/core', () => ({ getEnv }));

import { register } from './instrumentation';

afterEach(() => {
  getEnv.mockReset();
  delete process.env.NEXT_RUNTIME;
});

describe('instrumentation.register', () => {
  it('validates the environment on the Node.js server so a bad configuration refuses to start', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    await register();
    expect(getEnv).toHaveBeenCalledTimes(1);
    getEnv.mockImplementation(() => {
      throw new Error('Invalid environment: AUTH_SECRET: required');
    });
    await expect(register()).rejects.toThrow(/AUTH_SECRET/);
  });

  it('does nothing in the edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    await register();
    expect(getEnv).not.toHaveBeenCalled();
  });
});
