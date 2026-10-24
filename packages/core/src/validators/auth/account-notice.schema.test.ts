import { describe, expect, it } from 'vitest';
import { ACCOUNT_NOTICE_PARAM, accountNoticeSchema } from './account-notice.schema';

describe('accountNoticeSchema', () => {
  it('accepts only the known notice; anything from the URL that is not one renders nothing', () => {
    expect(accountNoticeSchema.safeParse('existing_account').success).toBe(true);
    for (const value of ['', 'EXISTING_ACCOUNT', '<script>', 'role_changed', undefined, 1])
      expect(accountNoticeSchema.safeParse(value).success, String(value)).toBe(false);
    expect(ACCOUNT_NOTICE_PARAM).toBe('notice');
  });
});
