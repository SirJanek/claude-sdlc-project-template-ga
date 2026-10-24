import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../config/env';
import { createLogger } from '../../logger';
import { MockMailSender } from './adapters/mock-mail-sender';
import { createMailSender } from './create-mail-sender';

describe('createMailSender', () => {
  it('builds the adapter named by MAIL_ADAPTER (mock is the only one so far)', () => {
    const env = parseEnv({ NODE_ENV: 'test', MAIL_ADAPTER: 'mock' });
    expect(createMailSender({ env, logger: createLogger({ level: 'silent' }) })).toBeInstanceOf(MockMailSender);
  });
});
