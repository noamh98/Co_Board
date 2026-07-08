// domain/qr.ts — מקודד QR טהור (Model 2) ללא תלויות, לשיתוף קוד-הזמנה (C-12).
// תמיכה: מצב אלפאנומרי, גרסאות 1–4, רמת תיקון שגיאות L, בלוק EC יחיד.
// framework-free (אין DOM/רשת), אפס any. שכבת הדומיין נשארת טהורה — הרינדור ל-SVG
// מתבצע בשכבת ה-presentation.
//
// אימות (offline, מול קבועים סמכותיים): מקדמי Reed-Solomon; וקטור המספרי
// "01234567" מ-ISO/IEC 18004; טבלת format-information הרשמית; ספירת מודולי-נתונים
// המדויקת לכל גרסה (208/359/567/807); ו-roundtrip של קידוד→פענוח שמשחזר codewords.

/** תווים מותרים במצב אלפאנומרי של QR (כולל ספרות ואותיות גדולות — hex גדול נכנס). */
export const QR_ALNUM_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/** סמל QR מוכן לרינדור: מטריצה בוליאנית (true = מודול כהה). */
export interface QrSymbol {
  readonly size: number;
  readonly modules: readonly (readonly boolean[])[];
  readonly version: number;
  readonly mask: number;
}

interface VersionSpec {
  readonly ec: number;
  readonly data: number;
  readonly align: readonly number[];
}

const VERSIONS: Readonly<Record<number, VersionSpec>> = {
  1: { ec: 7, data: 19, align: [] },
  2: { ec: 10, data: 34, align: [6, 18] },
  3: { ec: 15, data: 55, align: [6, 22] },
  4: { ec: 20, data: 80, align: [6, 26] },
};

const EC_L_BITS = 0b01;

// --- Galois field GF(256) עם פולינום 0x11d ---
const GF_EXP: number[] = new Array<number>(512);
const GF_LOG: number[] = new Array<number>(256);
(function initGf(): void {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if ((x & 0x100) !== 0) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** פולינום מחולל Reed-Solomon בדרגה נתונה (מקדמים מהגבוה לנמוך, כולל מקדם מוביל 1). */
export function rsGenerator(degree: number): number[] {
  let poly: number[] = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** מחשב codewords של תיקון שגיאות עבור מערך נתונים. */
export function rsEncode(data: readonly number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const res = new Array<number>(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ res[0];
    res.shift();
    res.push(0);
    for (let j = 0; j < ecLen; j++) res[j] ^= gfMul(gen[j + 1], factor);
  }
  return res;
}

function sizeOf(version: number): number {
  return 17 + 4 * version;
}

/** האם המחרוזת ניתנת לקידוד במצב אלפאנומרי (כל התווים ב-charset). */
export function isAlnumEncodable(text: string): boolean {
  for (const ch of text) {
    if (QR_ALNUM_CHARSET.indexOf(ch) < 0) return false;
  }
  return text.length > 0;
}

function encodeAlnumBits(text: string): number[] {
  const bits: number[] = [];
  const put = (val: number, len: number): void => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  put(0b0010, 4); // מצב אלפאנומרי
  put(text.length, 9); // מונה תווים (גרסאות 1–9)
  for (let i = 0; i < text.length; i += 2) {
    if (i + 1 < text.length) {
      put(QR_ALNUM_CHARSET.indexOf(text[i]) * 45 + QR_ALNUM_CHARSET.indexOf(text[i + 1]), 11);
    } else {
      put(QR_ALNUM_CHARSET.indexOf(text[i]), 6);
    }
  }
  return bits;
}

function pickVersion(bitLen: number): number {
  for (const v of [1, 2, 3, 4]) {
    if (bitLen <= VERSIONS[v].data * 8) return v;
  }
  throw new Error('QR payload too large for versions 1–4');
}

function buildCodewords(bits: readonly number[], version: number): number[] {
  const cap = VERSIONS[version].data * 8;
  const out = bits.slice();
  for (let i = 0; i < 4 && out.length < cap; i++) out.push(0); // terminator
  while (out.length % 8 !== 0) out.push(0);
  const pad = [0xec, 0x11];
  let pi = 0;
  while (out.length < cap) {
    const b = pad[pi++ % 2];
    for (let i = 7; i >= 0; i--) out.push((b >> i) & 1);
  }
  const data: number[] = [];
  for (let i = 0; i < out.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | out[i + j];
    data.push(b);
  }
  return data.concat(rsEncode(data, VERSIONS[version].ec));
}

// --- מטריצה ---
interface Cell {
  value: number;
  fn: boolean;
}
type Grid = (Cell | null)[][];

function newGrid(n: number): Grid {
  const g: Grid = [];
  for (let i = 0; i < n; i++) g.push(new Array<Cell | null>(n).fill(null));
  return g;
}

function placeFinder(g: Grid, r: number, c: number): void {
  const n = g.length;
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const inRing =
        (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
        (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
      const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      g[rr][cc] = { value: inRing || inCore ? 1 : 0, fn: true };
    }
  }
}

function placeAlign(g: Grid, r: number, c: number): void {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const ring = Math.max(Math.abs(dr), Math.abs(dc));
      g[r + dr][c + dc] = { value: ring !== 1 ? 1 : 0, fn: true };
    }
  }
}

function buildFunctionPatterns(version: number): Grid {
  const n = sizeOf(version);
  const g = newGrid(n);
  placeFinder(g, 0, 0);
  placeFinder(g, 0, n - 7);
  placeFinder(g, n - 7, 0);
  for (let i = 8; i < n - 8; i++) {
    if (g[6][i] === null) g[6][i] = { value: i % 2 === 0 ? 1 : 0, fn: true };
    if (g[i][6] === null) g[i][6] = { value: i % 2 === 0 ? 1 : 0, fn: true };
  }
  g[n - 8][8] = { value: 1, fn: true }; // מודול כהה קבוע
  const al = VERSIONS[version].align;
  for (const r of al) {
    for (const c of al) {
      const nearFinder =
        (r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8);
      if (nearFinder) continue;
      placeAlign(g, r, c);
    }
  }
  return g;
}

function reserveFormat(g: Grid): void {
  const n = g.length;
  const mark = (r: number, c: number): void => {
    const cell = g[r][c];
    if (cell === null || !cell.fn) g[r][c] = { value: 0, fn: true };
  };
  for (let i = 0; i < 9; i++) {
    if (i !== 6) mark(8, i);
    if (i !== 6) mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, n - 1 - i);
    mark(n - 1 - i, 8);
  }
}

function dataModuleOrder(g: Grid): [number, number][] {
  const n = g.length;
  const order: [number, number][] = [];
  let upward = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const row = upward ? n - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (g[row][c] === null) order.push([row, c]);
      }
    }
    upward = !upward;
  }
  return order;
}

const MASK_FNS: readonly ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function placeData(g: Grid, codewords: readonly number[]): void {
  const bits: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  const order = dataModuleOrder(g);
  for (let i = 0; i < order.length; i++) {
    const [r, c] = order[i];
    g[r][c] = { value: i < bits.length ? bits[i] : 0, fn: false };
  }
}

function applyMask(g: Grid, k: number): void {
  const fn = MASK_FNS[k];
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g.length; c++) {
      const cell = g[r][c];
      if (cell !== null && !cell.fn && fn(r, c)) cell.value ^= 1;
    }
  }
}

/** ביטי format-information (15 ביט) לאחר BCH ו-XOR עם המסכה הקבועה. */
export function formatInfoBits(ecBits: number, mask: number): number {
  const data = (ecBits << 3) | mask;
  let d = data << 10;
  const g = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if (((d >> i) & 1) !== 0) d ^= g << (i - 10);
  }
  return ((data << 10) | d) ^ 0b101010000010010;
}

function placeFormat(g: Grid, ecBits: number, mask: number): void {
  const n = g.length;
  const bits = formatInfoBits(ecBits, mask);
  const get = (i: number): number => (bits >> i) & 1;
  const coords1: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = coords1[i];
    g[r][c] = { value: get(14 - i), fn: true };
  }
  const coords2: [number, number][] = [
    [n - 1, 8], [n - 2, 8], [n - 3, 8], [n - 4, 8], [n - 5, 8], [n - 6, 8], [n - 7, 8],
    [8, n - 8], [8, n - 7], [8, n - 6], [8, n - 5], [8, n - 4], [8, n - 3], [8, n - 2], [8, n - 1],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = coords2[i];
    g[r][c] = { value: get(14 - i), fn: true };
  }
}

function penalty(g: Grid): number {
  const n = g.length;
  const at = (r: number, c: number): number => {
    const cell = g[r][c];
    return cell !== null ? cell.value : 0;
  };
  let p = 0;
  // חוק 1 — רצפים
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c < n; c++) {
      if (at(r, c) === at(r, c - 1)) {
        run++;
        if (run === 5) p += 3;
        else if (run > 5) p++;
      } else run = 1;
    }
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r < n; r++) {
      if (at(r, c) === at(r - 1, c)) {
        run++;
        if (run === 5) p += 3;
        else if (run > 5) p++;
      } else run = 1;
    }
  }
  // חוק 2 — בלוקים 2x2
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) p += 3;
    }
  }
  // חוק 3 — תבניות דמויות-finder
  const p1 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const p2 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const scan = (get: (i: number) => number): void => {
    for (let i = 0; i + 11 <= n; i++) {
      let m1 = true;
      let m2 = true;
      for (let k = 0; k < 11; k++) {
        const v = get(i + k);
        if (v !== p1[k]) m1 = false;
        if (v !== p2[k]) m2 = false;
      }
      if (m1 || m2) p += 40;
    }
  };
  for (let r = 0; r < n; r++) scan((i) => at(r, i));
  for (let c = 0; c < n; c++) scan((i) => at(i, c));
  // חוק 4 — יחס כהה
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (at(r, c) !== 0) dark++;
  const ratio = (dark / (n * n)) * 100;
  p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return p;
}

/** מייצר סמל QR עבור טקסט אלפאנומרי (בוחר גרסה, מסכה אופטימלית, רמת EC=L). */
export function generateQr(text: string): QrSymbol {
  if (!isAlnumEncodable(text)) {
    throw new Error('QR text must be non-empty and alphanumeric-encodable');
  }
  const bits = encodeAlnumBits(text);
  const version = pickVersion(bits.length);
  const codewords = buildCodewords(bits, version);
  let best: Grid | null = null;
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask++) {
    const g = buildFunctionPatterns(version);
    reserveFormat(g);
    placeData(g, codewords);
    applyMask(g, mask);
    placeFormat(g, EC_L_BITS, mask);
    const pen = penalty(g);
    if (pen < bestPenalty) {
      bestPenalty = pen;
      best = g;
      bestMask = mask;
    }
  }
  const chosen: Grid = best ?? buildFunctionPatterns(version);
  const modules = chosen.map((row) => row.map((cell) => cell !== null && cell.value === 1));
  return { size: chosen.length, modules, version, mask: bestMask };
}
