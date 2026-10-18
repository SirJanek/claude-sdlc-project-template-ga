import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evidencePath } from './evidence';

const bin = fileURLToPath(new URL('../../node_modules/.bin/agent-browser', import.meta.url));

/** One isolated agent-browser session per test file (never the shared default session). */
export function createBrowser(name: string) {
  const session = `mentorhub-it-${name}-${process.pid}-${Date.now()}`;
  const env = {
    ...process.env,
    // --use-mock-keychain: no macOS keychain prompt; --no-sandbox: CI containers.
    AGENT_BROWSER_ARGS: '--use-mock-keychain,--no-sandbox,--mute-audio',
    AGENT_BROWSER_DEFAULT_TIMEOUT: '60000',
    AGENT_BROWSER_IDLE_TIMEOUT_MS: '120000',
  };
  const run = (...args: string[]) =>
    execFileSync(bin, ['--session', session, ...args], { env, encoding: 'utf8', timeout: 90_000 }).trim();
  return {
    open: (url: string) => run('open', url),
    waitForText: (text: string) => run('wait', '--text', text),
    click: (selector: string) => run('click', selector),
    text: (selector: string) => run('get', 'text', selector),
    count: (selector: string) => Number(run('get', 'count', selector)),
    url: () => run('get', 'url'),
    /** Saves a full-page screenshot to the evidence folder as `<file>-<name>.png`. */
    screenshot: (shot: string) => run('screenshot', '--full', evidencePath(`${name}-${shot}.png`)),
    close: () => run('close'),
  };
}
