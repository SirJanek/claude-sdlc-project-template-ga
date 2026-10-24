/** Value used when no proxy header names the client; every such request shares one rate-limit bucket. */
export const UNKNOWN_IP = 'unknown';

/**
 * Best-effort client address for rate limiting: the first `x-forwarded-for` entry (the reverse proxy
 * sets it), else `x-real-ip`, else UNKNOWN_IP. Only ever hashed with AUTH_SECRET — never stored or logged raw.
 */
export function readClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first;
  const real = request.headers.get('x-real-ip')?.trim();
  return real || UNKNOWN_IP;
}
