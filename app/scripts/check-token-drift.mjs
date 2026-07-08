#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────
 * check-token-drift.mjs — CSS-var drift guard (fixes C-01)
 * ---------------------------------------------------------------------------
 * Enforces a SINGLE authority for chrome color tokens (--cl-*).
 * The authority file is app/src/presentation/ui/tokens.css (coral palette,
 * loaded last in main.tsx → wins the cascade). Any OTHER CSS file that
 * *defines* a --cl-* custom property re-introduces the dead dual-palette
 * bug (two token systems loading at once). This script fails the build if
 * that happens. Files may freely *use* var(--cl-*) — only definitions are
 * checked.
 * ───────────────────────────────────────────────────────────────────────── */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const AUTHORITY = ['src', 'presentation', 'ui', 'tokens.css'].join('/');

/** Recursively collect all *.css files under src/. */
function cssFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...cssFiles(p));
    else if (name.endsWith('.css')) out.push(p);
  }
  return out;
}

// Match a --cl-* custom-property DEFINITION (name followed by a colon), not a
// var() usage. Any occurrence of "var(" immediately before the token is skipped.
const DEF_RE = /(--cl-[a-z0-9-]+)\s*:/gi;

const violations = [];
for (const file of cssFiles(SRC)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (rel === AUTHORITY) continue; // authority is allowed to define --cl-*
  const css = readFileSync(file, 'utf8');
  css.split('\n').forEach((line, i) => {
    let m;
    const re = new RegExp(DEF_RE.source, 'gi');
    while ((m = re.exec(line)) !== null) {
      const before = line.slice(Math.max(0, m.index - 4), m.index);
      if (/var\($/.test(before)) continue; // it's a var(--cl-x) usage
      violations.push({ rel, line: i + 1, token: m[1], text: line.trim() });
    }
  });
}

if (violations.length) {
  console.error('\n\u274C  CSS token drift detected (C-01 guard).');
  console.error('   Chrome tokens (--cl-*) may only be DEFINED in ' + AUTHORITY + '.');
  console.error('   Move these definitions there (or use var() to consume them):\n');
  for (const v of violations) {
    console.error(`   ${v.rel}:${v.line}  ${v.token}\n      ${v.text}`);
  }
  console.error(`\n   ${violations.length} drift violation(s).\n`);
  process.exit(1);
}
console.log('\u2705  Token drift check passed — --cl-* defined only in the authority file.');
