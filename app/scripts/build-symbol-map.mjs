// M20 — בונה מפת מילה→ARASAAC id + מוריד פיקטוגרמות מקומית (offline-first).
// אוטומטי: לכל מילה ייחודית בספריית הלוחות שולף את התוצאה הראשונה מ-ARASAAC.
// פלט: app/src/domain/symbolMap.generated.ts + app/public/symbols/{id}.png
// שימוש: node scripts/build-symbol-map.mjs
// אחרי הריצה — מעבר ידני לאימות/תיקון סמלים שגויים (PRD §4.2 אימות אנושי).

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LIB = join(ROOT, 'src/domain/boardLibrary.ts');
const OUT_MAP = join(ROOT, 'src/domain/symbolMap.generated.ts');
const OUT_DIR = join(ROOT, 'public/symbols');
const API = 'https://api.arasaac.org/v1';
const CDN = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

// מילים בלי פיקטוגרמה הולמת ב-ARASAAC → fallback ל-label (PRD: צילום אישי/AI בפאזה 2)
const SKIP = new Set(['במבה', 'ביסלי', 'iPad']);

// תאי ניווט/מערכת אינם "מילים" — נסרקים אבל label שלהם כבר מסונן בפועל ע"י regex word()

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

function extractLabels(src) {
  // word('id', 'label', 'nikud', 'fitz' ...) — תופס את ה-label (ארגומנט שני)
  const re = /word\(\s*'[^']*'\s*,\s*'([^']+)'/g;
  const set = new Set();
  let m;
  while ((m = re.exec(src)) !== null) set.add(m[1].trim());
  return [...set];
}

async function resolveId(label) {
  // ניסיון 1: ביטוי מלא. ניסיון 2: מילה ראשונה (לצירופים "כואב לי", "ארוחת בוקר").
  const candidates = [label, label.split(' ')[0]];
  for (const q of candidates) {
    try {
      const res = await fetch(`${API}/pictograms/he/search/${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data[0]._id;
    } catch { /* רשת — ננסה מועמד הבא */ }
  }
  return null;
}

async function download(id) {
  const dest = join(OUT_DIR, `${id}.png`);
  if (await exists(dest)) return true;
  const res = await fetch(CDN(id));
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return true;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const src = await readFile(LIB, 'utf8');
  const labels = extractLabels(src).sort();
  console.log(`נמצאו ${labels.length} מילים ייחודיות.`);

  const map = {};
  const missing = [];
  for (const label of labels) {
    if (SKIP.has(label)) { missing.push(label); continue; }
    const id = await resolveId(label);
    if (id == null) { missing.push(label); console.log(`  ✗ ${label}`); continue; }
    const ok = await download(id);
    if (!ok) { missing.push(label); console.log(`  ✗ ${label} (id ${id} download failed)`); continue; }
    map[label] = id;
    console.log(`  ✓ ${label} → ${id}`);
  }

  const entries = Object.entries(map)
    .map(([w, id]) => `  ${JSON.stringify(w)}: ${id},`)
    .join('\n');
  const header = `// AUTO-GENERATED ע"י scripts/build-symbol-map.mjs — אל תערוך ידנית.
// מקור: ARASAAC (CC). תיקוני אימות ידני → ערוך symbolMap.ts (override).
// חסרים (fallback ל-label): ${missing.join(', ') || 'אין'}.
`;
  await writeFile(
    OUT_MAP,
    `${header}export const GENERATED_SYMBOL_MAP: Record<string, number> = {\n${entries}\n};\n`,
    'utf8',
  );
  console.log(`\nנכתב ${Object.keys(map).length} מיפויים. חסרים: ${missing.length} (${missing.join(', ')}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
