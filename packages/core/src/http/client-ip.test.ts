import { describe, expect, it } from 'vitest';
import { UNKNOWN_IP, readClientIp } from './client-ip';

const req = (headers: Record<string, string>) => new Request('http://local/api/auth/email/start', { headers });

describe('readClientIp', () => {
  it('takes the first x-forwarded-for entry, then x-real-ip, else the unknown bucket', () => {
    expect(readClientIp(req({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
    expect(readClientIp(req({ 'x-forwarded-for': ' 203.0.113.9 ' }))).toBe('203.0.113.9');
    expect(readClientIp(req({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(readClientIp(req({ 'x-real-ip': ' ' }))).toBe(UNKNOWN_IP);
    expect(readClientIp(req({}))).toBe(UNKNOWN_IP);
  });
});
