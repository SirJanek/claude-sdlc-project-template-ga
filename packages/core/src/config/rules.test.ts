import { describe, expect, it } from 'vitest';
import { RULES, introPrice, isBookable, isFreeCancellation, platformFeePercent, sessionPrice } from './rules';

const at = (iso: string) => new Date(iso);

describe('pricing', () => {
  it('prices a session pro rata to the hourly rate', () => {
    expect(sessionPrice(80, 60)).toBe(80);
    expect(sessionPrice(80, 30)).toBe(40);
    expect(sessionPrice(95, 90)).toBe(142.5);
  });

  it('makes the intro half the price of a regular 30-minute session', () => {
    expect(introPrice(80)).toBe(20);
    expect(introPrice(120)).toBe(30);
    expect(introPrice(80)).toBeLessThan(sessionPrice(80, RULES.introMinutes));
  });
});

describe('cancellation and booking windows', () => {
  const start = at('2026-10-20T18:00:00Z');

  it('allows free cancellation exactly at the 12-hour boundary and not after', () => {
    expect(isFreeCancellation(start, at('2026-10-20T06:00:00Z'))).toBe(true);
    expect(isFreeCancellation(start, at('2026-10-20T06:00:01Z'))).toBe(false);
  });

  it('requires 4 hours of notice to book', () => {
    expect(isBookable(start, at('2026-10-20T14:00:00Z'))).toBe(true);
    expect(isBookable(start, at('2026-10-20T14:30:00Z'))).toBe(false);
  });
});

describe('platform fee tiers', () => {
  it('drops from 25% to 20% at 50 h and to 15% at 200 h', () => {
    expect(platformFeePercent(0)).toBe(25);
    expect(platformFeePercent(49.9)).toBe(25);
    expect(platformFeePercent(50)).toBe(20);
    expect(platformFeePercent(199)).toBe(20);
    expect(platformFeePercent(200)).toBe(15);
  });
});

import { it as trialIt, expect as trialExpect } from 'vitest'
trialIt('TRIAL: deliberately failing test (merge gate check, never merge)', () => {
  trialExpect(1).toBe(2)
})
