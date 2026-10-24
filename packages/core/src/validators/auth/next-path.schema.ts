import { z } from 'zod';

const MAX_LENGTH = 512;
/**
 * Any character outside printable ASCII / above Latin-1 controls: control characters (tab, CR, LF, NUL, …),
 * space and DEL. Written as a search for a forbidden character, not an anchored `^…$` match: JavaScript's
 * `$` also matches before a trailing line terminator, so `"/ok\n"` would pass (review round 2, finding 3).
 */
const FORBIDDEN = /[^\x21-\x7e\u00a1-\uffff]/;
/**
 * A fixed, private base origin: a path is accepted only when the WHATWG URL parser keeps it on this
 * origin. That catches every escape the character rules alone would miss (`//host`, `/\host`,
 * `/\t/host` — the parser strips tabs and newlines before it looks for `//`).
 */
const TRUSTED_BASE = 'https://trusted.invalid';

/** True when `path` is a same-origin relative path: it can never navigate off the site it was issued for. */
export function isSameOriginPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || FORBIDDEN.test(path)) return false;
  // A printable path on a valid base never throws in the WHATWG parser; the origin check is what matters.
  const url = new URL(path, TRUSTED_BASE);
  return url.origin === TRUSTED_BASE && url.href.startsWith(`${TRUSTED_BASE}/`);
}

/**
 * A return path after sign-in must be same-origin and relative. Anything else is rejected rather than
 * "fixed", so an open redirect can never slip through (spec › Flows 4; review finding 1: control
 * characters are removed by URL parsers, `/\t/evil.example` would become `https://evil.example/`).
 */
export const nextPathSchema = z
  .string()
  .max(MAX_LENGTH)
  .refine(isSameOriginPath, { message: 'Must be a relative path on this site.' });
