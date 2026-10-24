import { ValidationError } from './errors';

/** Reads a JSON body; empty → `{}`, malformed → ValidationError (422). Callers parse the result with Zod. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ValidationError('The request body is not valid JSON.');
  }
}
