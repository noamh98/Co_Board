import { readFileSync } from 'fs';

const checks = [];

const sss = readFileSync('src/services/symbols/symbolSearchService.ts', 'utf-8');
checks.push({ name: 'Offline safety: SymbolOfflineError thrown', pass: sss.includes('throw new SymbolOfflineError()') });

const ac = readFileSync('src/services/symbols/arasaacClient.ts', 'utf-8');
checks.push({ name: 'No API key: no Authorization header', pass: !ac.includes('Authorization') && !ac.includes('apiKey') });

checks.push({ name: 'Cache-first: getFromCache before fetch', pass: sss.indexOf('getFromCache') < sss.indexOf('fetch(') });

const db = readFileSync('src/data/db.ts', 'utf-8');
checks.push({ name: 'DB_VERSION=6 additive', pass: db.includes('DB_VERSION = 6') && db.includes("!db.objectStoreNames.contains(STORE_SYMBOL_CACHE)") });

const app = readFileSync('src/App.tsx', 'utf-8');
checks.push({ name: 'pruneCache(30) in App init', pass: app.includes('void pruneCache(30)') });

let allPass = true;
for (const c of checks) {
  console.log(`${c.pass ? '✓' : '✗'} ${c.name}`);
  if (!c.pass) allPass = false;
}
console.log(allPass ? '\nAll invariants OK' : '\nFAIL');
process.exit(allPass ? 0 : 1);
