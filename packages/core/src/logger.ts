import pino, { type Logger } from 'pino';

/** Fields that must never reach a log line (standards › Secrets & logging). */
export const REDACTED_PATHS = [
  'password',
  '*.password',
  'token',
  '*.token',
  'jwt',
  '*.jwt',
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'set-cookie',
  '*.set-cookie',
  'mh_session',
  '*.mh_session',
  'mh_github',
  '*.mh_github',
  'access_token',
  '*.access_token',
  'accessToken',
  '*.accessToken',
  'email',
  '*.email',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
];

export function createLogger(options: { level?: string; destination?: pino.DestinationStream } = {}): Logger {
  return pino(
    { level: options.level ?? 'info', redact: { paths: REDACTED_PATHS, censor: '[redacted]' } },
    options.destination,
  );
}

let shared: Logger | undefined;

/** The shared logger. Never use console.* in application code. */
export function getLogger(): Logger {
  shared ??= createLogger({ level: process.env.LOG_LEVEL ?? 'info' });
  return shared;
}
