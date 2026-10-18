import { describe, expect, it } from 'vitest';
import { GitHubClientError } from './github-client.port';

describe('GitHubClientError', () => {
  it('carries the reason for the log and a default message naming it', () => {
    const error = new GitHubClientError('timeout');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('GitHubClientError');
    expect(error.reason).toBe('timeout');
    expect(error.message).toBe('GitHub sign-in failed (timeout)');
    expect(new GitHubClientError('provider', 'GitHub API /user answered 500').message).toBe(
      'GitHub API /user answered 500',
    );
  });
});
