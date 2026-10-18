import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createLogger } from '../logger';
import { apiHandler, REQUEST_HEADER } from './apiHandler';
import { ConflictError } from './errors';

const ctx = { params: Promise.resolve({}) };
const lines: string[] = [];
const logger = createLogger({ destination: { write: (line: string) => void lines.push(line) } });
const get = () => new Request('http://local/api/x');
const post = (headers: Record<string, string> = { [REQUEST_HEADER]: '1' }) =>
  new Request('http://local/api/x', { method: 'POST', headers, body: '{}' });

describe('apiHandler', () => {
  it('wraps data in the success envelope', async () => {
    const res = await apiHandler(async () => [1, 2], { logger })(get(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: [1, 2] });
  });

  it('maps AppError to its status and code', async () => {
    const res = await apiHandler(
      async () => {
        throw new ConflictError('Slot taken.');
      },
      { logger },
    )(get(), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: { code: 'conflict', message: 'Slot taken.' } });
  });

  it('maps ZodError to 422 with field errors', async () => {
    const res = await apiHandler(
      async () => z.object({ email: z.string().email('Bad email.') }).parse({ email: 'x' }),
      {
        logger,
      },
    )(get(), ctx);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: { code: 'validation_failed', fieldErrors: { email: ['Bad email.'] } },
    });
  });

  it('hides unexpected errors behind a generic 500 and logs them', async () => {
    lines.length = 0;
    const res = await apiHandler(
      async () => {
        throw new Error('relation "secret_table" does not exist');
      },
      { logger },
    )(get(), ctx);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain('secret_table');
    expect(text).not.toContain('at ');
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong. Please try again.' },
    });
    expect(lines.join('')).toContain('unhandled route error');
  });

  it('rejects state-changing requests without the request header (CSRF)', async () => {
    const handler = apiHandler(async () => 'done', { logger });
    expect((await handler(post({}), ctx)).status).toBe(403);
    expect((await handler(post(), ctx)).status).toBe(200);
  });

  it('passes a returned Response through unchanged (escape hatch)', async () => {
    const res = await apiHandler(async () => Response.json({ status: 'degraded' }, { status: 503 }), { logger })(
      get(),
      ctx,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'degraded' });
  });
});

describe('apiHandler — defaults', () => {
  it('keys form-level validation errors as _form', async () => {
    const res = await apiHandler(async () => z.string().parse(42), { logger })(get(), ctx);
    expect(await res.json()).toMatchObject({ error: { fieldErrors: { _form: [expect.any(String)] } } });
  });

  it('uses the shared logger when none is passed', async () => {
    process.env.LOG_LEVEL = 'silent';
    const res = await apiHandler(async () => {
      throw new Error('boom');
    })(get(), ctx);
    expect(res.status).toBe(500);
  });
});
