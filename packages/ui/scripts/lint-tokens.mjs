#!/usr/bin/env node
/* eslint-disable no-console -- CLI script: findings go to stderr, summary to stdout */
/**
 * lint-tokens — finds values that bypass the design tokens and exits 1 when any is found.
 * Rule 3 of the design-system prompt: no hex / rgb / hsl / oklch outside the tokens file,
 * no Tailwind palette classes (bg-zinc-900, text-white, from-indigo-950), no arbitrary values (p-[13px]).
 * Layering: a component takes a meaning, never the raw palette — var(--dm-*) only in the tokens file
 * and in the @theme mapping of globals.css. Action colours get no opacity modifier (bg-primary/90):
 * hover and pressed states come from their own tokens (--primary-hover, tokeny.md K2).
 *
 * Usage: node scripts/lint-tokens.mjs [dir ...]   (default: src)
 * Allowed: src/styles/tokens.css (the tokens file). globals.css keeps the untouched .dark block,
 * listed as a known exception below until a dark theme is decided (L2).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = process.argv.slice(2);
const dirs = roots.length ? roots : ['src'];
const TOKENS_FILE = /src[\\/]+styles[\\/]+tokens\.css$/;
const GLOBALS_FILE = /src[\\/]+styles[\\/]+globals\.css$/;
const KNOWN_EXCEPTIONS = [{ file: GLOBALS_FILE, insideBlock: '.dark {' }];
// The @theme block maps semantic and raw tokens onto Tailwind; it is the only place outside tokens.css
// allowed to read var(--dm-*).
const RAW_ALLOWED_BLOCK = { file: GLOBALS_FILE, insideBlock: '@theme' };
const EXT = /\.(tsx?|jsx?|css|mdx)$/;
const SKIP_DIR = /(^|[\\/])(node_modules|coverage|storybook-static|dist|\.next)$/;

const PALETTE =
  '(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const CHECKS = [
  { name: 'hex colour', re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g },
  { name: 'rgb/hsl/oklch colour', re: /\b(?:rgba?|hsla?|oklch|oklab)\(/g },
  {
    name: 'Tailwind palette class',
    re: new RegExp(
      `(?<![\\w-])(?:[a-z-]+:)*(?:bg|text|border|from|via|to|ring|outline|fill|stroke|decoration|shadow|divide|accent|caret|placeholder)-${PALETTE}(?:-\\d{2,3})?(?:/\\d{1,3})?\\b`,
      'g',
    ),
  },
  { name: 'raw palette token outside the tokens file', re: /var\(\s*--dm-[\w-]+/g, raw: true },
  {
    name: 'opacity on an action colour (use its state token)',
    re: /(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|outline)-(?:primary|secondary|destructive|accent)(?:-foreground)?\/\d{1,3}\b/g,
  },
  { name: 'Tailwind arbitrary value', re: /(?<![\w-])(?:[a-z-]+:)*[a-z]+(?:-[a-z]+)*-\[[^\]\s]+\]/g },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIR.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

function stripComments(line) {
  return line.replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, '');
}

// Documentation may NAME a forbidden value inside inline code (`bg-indigo-600`) to say "never do this".
// Only inline-code spans in .mdx prose are skipped; JSX and attributes in the same file are still checked.
function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, '``');
}

const findings = [];
for (const dir of dirs) {
  for (const file of walk(dir)) {
    if (TOKENS_FILE.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    const exception = KNOWN_EXCEPTIONS.find((e) => e.file.test(file));
    let inException = false;
    let depth = 0;
    const rawAllowed = RAW_ALLOWED_BLOCK.file.test(file);
    let inRawBlock = false;
    let rawDepth = 0;
    lines.forEach((raw, i) => {
      if (exception) {
        if (raw.includes(exception.insideBlock)) {
          inException = true;
          depth = 0;
        }
        if (inException) {
          depth += (raw.match(/{/g) || []).length - (raw.match(/}/g) || []).length;
          if (depth <= 0 && raw.includes('}')) inException = false;
          return;
        }
      }
      let rawOk = false;
      if (rawAllowed) {
        if (raw.includes(RAW_ALLOWED_BLOCK.insideBlock)) {
          inRawBlock = true;
          rawDepth = 0;
        }
        if (inRawBlock) {
          rawOk = true;
          rawDepth += (raw.match(/{/g) || []).length - (raw.match(/}/g) || []).length;
          if (rawDepth <= 0 && raw.includes('}')) inRawBlock = false;
        }
      }
      const line = file.endsWith('.mdx') ? stripInlineCode(stripComments(raw)) : stripComments(raw);
      for (const { name, re, raw: isRawCheck } of CHECKS) {
        if (isRawCheck && rawOk) continue;
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          if (
            name === 'Tailwind arbitrary value' &&
            (/^(?:[a-z-]+:)*(?:data|aria|has|group|peer|supports|nth)-/.test(m[0]) || /\[var\(--dm-/.test(m[0]))
          )
            continue; // bg-[var(--dm-*)] is reported once, by the raw palette rule
          findings.push({ file: relative(process.cwd(), file), line: i + 1, kind: name, value: m[0] });
        }
      }
    });
  }
}

if (findings.length) {
  console.error(`lint-tokens: ${findings.length} value(s) outside the tokens file\n`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.kind}: ${f.value}`);
  console.error('\nUse a semantic token (see src/styles/tokens.css) or add the value there with its source.');
  process.exit(1);
}
console.log(`lint-tokens: OK (${dirs.join(', ')})`);
