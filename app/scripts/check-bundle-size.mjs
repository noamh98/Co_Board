#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
 * check-bundle-size.mjs — bundle-size budget guard (Stage C §18.3)
 * ---------------------------------------------------------------------------
 * Low-end Android is a primary target device. An unnoticed dependency or a
 * heavy import can silently balloon the JS payload and wreck first-load on a
 * throttled 3G/low-CPU phone. This script turns that into a hard CI gate:
 * after `vite build`, it gzips every emitted .js/.css asset under dist/ and
 * fails the build if the TOTAL gzipped JS (or CSS) exceeds its budget.
 *
 * Budgets are intentionally real ceilings (not auto-calibrated) so a genuine
 * regression breaks the build. Override per-environment via:
 *     BUNDLE_JS_GZIP_KB   (default 500)
 *     BUNDLE_CSS_GZIP_KB  (default 100)
 *
 * The report prints measured sizes and a ⚠ warning at >=80% of budget, so the
 * ceiling can be ratcheted down as the bundle is optimized.
 *
 * Only build-time node built-ins are used — this file lives in scripts/, never
 * under app/src (the app layer stays free of node:* imports).
 * ─────────────────────────────────────────────────────────────────────────── */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const JS_BUDGET_KB = Number(process.env.BUNDLE_JS_GZIP_KB ?? 500);
const CSS_BUDGET_KB = Number(process.env.BUNDLE_CSS_GZIP_KB ?? 100);

/** Recursively collect all files under a directory. */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error('\n❌  dist/ not found — run `npm run build` before the bundle-size check.\n');
  process.exit(1);
}

const KB = 1024;
const files = walk(DIST);

const groups = {
  js: { budgetKb: JS_BUDGET_KB, label: 'JS', bytes: 0, items: [] },
  css: { budgetKb: CSS_BUDGET_KB, label: 'CSS', bytes: 0, items: [] },
};

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const group = ext === '.js' ? groups.js : ext === '.css' ? groups.css : null;
  if (!group) continue;
  const gz = gzipSync(readFileSync(file)).length;
  group.bytes += gz;
  group.items.push({ rel: relative(DIST, file).split(sep).join('/'), gz });
}

const fmt = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

console.log('\n📦  Bundle-size budget (gzipped) — Stage C §18.3\n');
let failed = false;

for (const key of Object.keys(groups)) {
  const g = groups[key];
  const totalKb = g.bytes / KB;
  const pct = g.budgetKb > 0 ? (totalKb / g.budgetKb) * 100 : 0;

  console.log(`  ${g.label}: ${fmt(g.bytes)} / ${g.budgetKb} KB budget  (${pct.toFixed(0)}%)`);
  for (const it of g.items.sort((a, b) => b.gz - a.gz)) {
    console.log(`      ${fmt(it.gz).padStart(9)}  ${it.rel}`);
  }

  if (totalKb > g.budgetKb) {
    failed = true;
    console.error(
      `  ❌  ${g.label} bundle ${fmt(g.bytes)} exceeds the ${g.budgetKb} KB gzip budget.`,
    );
  } else if (pct >= 80) {
    console.warn(
      `  ⚠  ${g.label} bundle at ${pct.toFixed(0)}% of budget — consider tightening or trimming.`,
    );
  }
  console.log('');
}

if (failed) {
  console.error(
    'Bundle-size budget exceeded. Reduce payload or, if intentional, raise the\n' +
      'BUNDLE_JS_GZIP_KB / BUNDLE_CSS_GZIP_KB budget in CI with justification.\n',
  );
  process.exit(1);
}

console.log('✅  Bundle-size budget check passed.\n');
