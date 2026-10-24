import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EXISTING_ACCOUNT_NOTICE, ExistingAccountNotice } from './ExistingAccountNotice';

afterEach(cleanup);

describe('ExistingAccountNotice', () => {
  it('announces, as a status, that the existing account was signed in to and its role was not changed', () => {
    render(<ExistingAccountNotice />);
    const notice = screen.getByRole('status');
    expect(notice.textContent).toBe(EXISTING_ACCOUNT_NOTICE);
    expect(notice.textContent).toContain('its role was not changed');
    expect(notice.getAttribute('data-slot')).toBe('account-notice');
  });
});
