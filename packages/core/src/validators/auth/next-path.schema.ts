import { z } from 'zod';

const MAX_LENGTH = 512;

/**
 * A return path after sign-in must be same-origin and relative: starts with one `/`, never `//`
 * (protocol-relative URL) and never a backslash (browsers treat `/\evil` like `//evil`). Anything
 * else is rejected rather than "fixed", so an open redirect can never slip through (spec › Flows 4).
 */
export const nextPathSchema = z
  .string()
  .max(MAX_LENGTH)
  .refine((path) => path.startsWith('/') && !path.startsWith('//') && !path.includes('\\'), {
    message: 'Must be a relative path on this site.',
  });
