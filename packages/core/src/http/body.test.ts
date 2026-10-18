import { describe, expect, it } from 'vitest';
import { readJsonBody } from './body';
import { ValidationError } from './errors';

const post = (body?: string) => new Request('http://local/api/x', { method: 'POST', body });

describe('readJsonBody', () => {
  it('parses JSON, treats an empty body as {} and rejects malformed JSON with a 422 error', async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJsonBody(post())).toEqual({});
    await expect(readJsonBody(post('{nope'))).rejects.toThrow(ValidationError);
    await expect(readJsonBody(post('{nope'))).rejects.toThrow('The request body is not valid JSON.');
  });
});
