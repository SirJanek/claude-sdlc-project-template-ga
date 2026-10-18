/**
 * Business parameters proposed in discovery (docs/discovery/02-Use-case-i-przeplywy.md).
 * They are proposals until a spec adopts them — but they live in ONE place, never as literals
 * elsewhere in the code.
 */
export const RULES = {
  introMinutes: 30,
  /** Intro costs this fraction of a regular session of the same length. */
  introPriceFactor: 0.5,
  minNoticeHours: 4,
  freeCancelHours: 12,
  holdMinutes: 10,
  roomOpensMinutesBefore: 10,
  serviceFee: 1.5,
  payoutMin: 50,
  /** [hours taught threshold, platform fee %] — ascending. */
  platformFeeTiers: [
    [0, 25],
    [50, 20],
    [200, 15],
  ] as const satisfies readonly (readonly [number, number])[],
} as const;

export type Rules = typeof RULES;

/** Price of a session of `minutes` for a mentor charging `hourlyRate` per 60 minutes. */
export function sessionPrice(hourlyRate: number, minutes: number): number {
  return roundMoney((hourlyRate * minutes) / 60);
}

/** Intro price: half the price of a regular session of the intro length. */
export function introPrice(hourlyRate: number, rules: Rules = RULES): number {
  return roundMoney(sessionPrice(hourlyRate, rules.introMinutes) * rules.introPriceFactor);
}

/** True when a session starting at `start` can still be cancelled or moved for free at `now`. */
export function isFreeCancellation(start: Date, now: Date, rules: Rules = RULES): boolean {
  return start.getTime() - now.getTime() >= rules.freeCancelHours * 3_600_000;
}

/** True when a slot starting at `start` respects the minimum booking notice at `now`. */
export function isBookable(start: Date, now: Date, rules: Rules = RULES): boolean {
  return start.getTime() - now.getTime() >= rules.minNoticeHours * 3_600_000;
}

/** Platform fee (%) for a mentor who has taught `hoursTaught` hours. */
export function platformFeePercent(hoursTaught: number, rules: Rules = RULES): number {
  let fee: number = rules.platformFeeTiers[0][1];
  for (const [threshold, percent] of rules.platformFeeTiers) if (hoursTaught >= threshold) fee = percent;
  return fee;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Authentication limits (spec: accounts and roles). Security parameters, not business ones, so they
 * live next to RULES rather than inside it (BACKWARD_COMPATIBILITY §4 reserves RULES for the latter).
 * Every value says why it is what it is.
 */
export const AUTH_LIMITS = {
  /** A person retrying a typo or waiting on a slow inbox asks 2–3 times; a script asks far more. */
  linksPerEmail: { max: 3, windowMinutes: 15 },
  /** A shared office NAT puts many people behind one address; 20 an hour still stops a flood. */
  linksPerIp: { max: 20, windowMinutes: 60 },
  /** The link proves the inbox is read now; 15 min covers delivery delays and bounds a leaked link. */
  linkTtlMinutes: 15,
  /** Resend only after the first mail had a chance to arrive. */
  resendAfterSeconds: 60,
  /** 7 days fixed, no refresh, no sliding window (grill-me Q6/Q13): a mentee who books today still reaches tomorrow's session. */
  sessionDays: 7,
  /** Token rows are kept 30 days for the first A07 read (grill-me Q9), then deleted by the next token creation. */
  tokenRetentionDays: 30,
  /** A GitHub round trip (consent screen, maybe a 2FA prompt) takes minutes, not hours; the state cookie dies after 10. */
  githubStateMinutes: 10,
  /** GitHub down or slow: the callback gives up after 10 s and fails closed instead of hanging the sign-in (spec › Edge Cases). */
  githubTimeoutMs: 10_000,
} as const;

export type AuthLimits = typeof AUTH_LIMITS;
