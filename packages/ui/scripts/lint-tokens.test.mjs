/**
 * Tests for lint-tokens on bait files: every rule must catch its bait and leave the allowed form alone.
 * Run: node --test scripts/lint-tokens.test.mjs   (pnpm test:lint-tokens)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'lint-tokens.mjs');

function lint(files) {
  const dir = mkdtempSync(join(tmpdir(), 'lint-tokens-'));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), body);
  }
  try {
    execFileSync('node', [SCRIPT, join(dir, 'src')], { cwd: dir, stdio: 'pipe' });
    return { code: 0, out: '' };
  } catch (e) {
    return { code: e.status, out: String(e.stderr) };
  }
}

const caught = [
  ['hex colour', 'src/a.css', '--dm-action-primary-fill: #335cff;'],
  ['raw palette token outside the tokens file', 'src/b.css', '.btn { background: var(--dm-accent-600); }'],
  ['raw palette token outside the tokens file', 'src/c.tsx', "<div style={{ color: 'var(--dm-danger-700)' }} />"],
  ['raw palette token outside the tokens file', 'src/d.tsx', '<div className="bg-[var(--dm-accent-600)]" />'],
  ['opacity on an action colour', 'src/e.tsx', '<button className="bg-primary hover:bg-primary/90" />'],
  ['Tailwind palette class', 'src/f.tsx', '<span className="text-white" />'],
  ['Tailwind arbitrary value', 'src/g.tsx', '<div className="p-[13px]" />'],
  ['raw palette token outside the tokens file', 'src/styles/globals.css', ':root { --x: var(--dm-neutral-0); }'],
];

for (const [kind, file, body] of caught) {
  test(`catches ${kind} in ${file}`, () => {
    const r = lint({ [file]: body });
    assert.equal(r.code, 1);
    assert.match(r.out, new RegExp(kind.replace(/[()]/g, '\\$&')));
  });
}

test('allows raw tokens and colours in tokens.css, @theme mapping, semantic classes', () => {
  const r = lint({
    'src/styles/tokens.css': ':root { --dm-accent-600: oklch(0.52 0.16 42); --primary: var(--dm-accent-600); }',
    'src/styles/globals.css':
      '@theme inline {\n  --text-sm: var(--dm-text-sm);\n}\n.dark {\n  --primary: oklch(0.7 0.1 42);\n}\n',
    'src/ok.tsx': '<button className="bg-primary hover:bg-primary-hover text-primary-foreground" />',
  });
  assert.equal(r.code, 0, r.out);
});

test('bg-[var(--dm-*)] is reported once, not twice', () => {
  const r = lint({ 'src/d.tsx': '<div className="bg-[var(--dm-accent-600)]" />' });
  assert.match(r.out, /1 value\(s\)/);
});
