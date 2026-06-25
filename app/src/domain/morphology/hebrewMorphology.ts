// domain/morphology/hebrewMorphology.ts — מנוע מורפולוגיה/הטיות עברי (I1 ⭐).
// טהור: TS בלבד, ללא תלות React/DOM. עובד על טקסט עיצורי (ללא ניקוד; הניקוד שדה נפרד).
// כיסוי: דפוסים נפוצים (רבים, מיודע, תחיליות, הטיית בינוני) + טבלת חריגים בתדירות גבוהה.
// המנוע מרחיב — מילים שאינן ניתנות להטיה מוחזרות כמות שהן (נפילה חיננית).

import type { CellMorphology } from '../models';

/** מסיר סימני ניקוד (U+0591–U+05C7) — המנוע עובד על העיצורים. */
export function stripNiqqud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

export interface InflectionTarget {
  gender?: 'm' | 'f';
  number?: 'singular' | 'plural';
  definite?: boolean;
}

// ── חריגים בתדירות גבוהה (צורת בסיס → רבים) ──
const IRREGULAR_PLURALS: Record<string, string> = {
  איש: 'אנשים',
  אישה: 'נשים',
  יום: 'ימים',
  בן: 'בנים',
  בת: 'בנות',
  עיר: 'ערים',
  אב: 'אבות',
  אם: 'אמהות',
  ילד: 'ילדים',
};

// ── חריגים: הטיית בינוני (זכר-יחיד → נקבה-יחיד / זכר-רבים / נקבה-רבים) ──
const IRREGULAR_PRESENT: Record<string, { fSg: string; mPl: string; fPl: string }> = {
  רוצה: { fSg: 'רוצה', mPl: 'רוצים', fPl: 'רוצות' },
  שותה: { fSg: 'שותה', mPl: 'שותים', fPl: 'שותות' },
  בא: { fSg: 'באה', mPl: 'באים', fPl: 'באות' },
  עושה: { fSg: 'עושה', mPl: 'עושים', fPl: 'עושות' },
};

const PREFIXES = new Set(['ו', 'ב', 'ל', 'כ', 'מ', 'ש']);

/** מוסיף ה' הידיעה (גס: לא מכפיל אם כבר מתחיל ב-ה). */
export function addDefiniteArticle(word: string): string {
  const w = stripNiqqud(word).trim();
  if (w.startsWith('ה')) return w;
  return 'ה' + w;
}

/** מוסיף תחילית חוק (ו/ב/ל/כ/מ/ש). תחילית לא חוקית → המילה ללא שינוי. */
export function addPrefix(word: string, prefix: string): string {
  if (!PREFIXES.has(prefix)) return stripNiqqud(word).trim();
  return prefix + stripNiqqud(word).trim();
}

/** ריבוי שם עצם — חריגים תחילה, אחרת דפוס רגיל (ה→ות, אחרת ים/ות לפי מין). */
export function pluralizeNoun(word: string, gender: 'm' | 'f' = 'm'): string {
  const w = stripNiqqud(word).trim();
  if (IRREGULAR_PLURALS[w]) return IRREGULAR_PLURALS[w];
  if (w.endsWith('ה')) return w.slice(0, -1) + 'ות'; // נקבה ב-ה → ות (ילדה→ילדות)
  return gender === 'f' ? w + 'ות' : w + 'ים';
}

/** הטיית בינוני (הווה) מצורת זכר-יחיד לכל שילובי מין/מספר. */
export function conjugatePresent(
  verbMascSing: string,
  target: { gender?: 'm' | 'f'; number?: 'singular' | 'plural' } = {},
): string {
  const base = stripNiqqud(verbMascSing).trim();
  const g = target.gender ?? 'm';
  const n = target.number ?? 'singular';
  if (g === 'm' && n === 'singular') return base;

  const irr = IRREGULAR_PRESENT[base];
  if (irr) {
    if (g === 'f' && n === 'singular') return irr.fSg;
    if (g === 'm' && n === 'plural') return irr.mPl;
    return irr.fPl;
  }

  // פעלים המסתיימים ב-ה (ל"ה): רוצה→רוצה(נ')/רוצים/רוצות
  if (base.endsWith('ה')) {
    const stem = base.slice(0, -1);
    if (g === 'f' && n === 'singular') return base;
    if (n === 'plural') return stem + (g === 'm' ? 'ים' : 'ות');
    return base;
  }

  // דפוס רגיל (שלמים): +ת לנקבה-יחיד, +ים לזכר-רבים, +ות לנקבה-רבים
  if (g === 'f' && n === 'singular') return base + 'ת';
  if (n === 'plural') return base + (g === 'm' ? 'ים' : 'ות');
  return base;
}

/** הטיית שם עצם — מספר (+מין) ויידוע. */
export function inflectNoun(word: string, target: InflectionTarget): string {
  let w = stripNiqqud(word).trim();
  if (target.number === 'plural') w = pluralizeNoun(w, target.gender);
  if (target.definite) w = addDefiniteArticle(w);
  return w;
}

/**
 * נקודת כניסה כללית ל"תאי הטיה" — מטה מילה לפי ה-POS שלה ויעד ההטיה.
 * verb → הטיית בינוני; noun → ריבוי/יידוע; אחרת — ללא שינוי.
 */
export function inflectWord(
  word: string,
  morphology: CellMorphology | undefined,
  target: InflectionTarget,
): string {
  const pos = morphology?.pos ?? 'other';
  if (pos === 'verb') {
    return conjugatePresent(word, { gender: target.gender, number: target.number });
  }
  if (pos === 'noun' || pos === 'adjective') {
    return inflectNoun(word, target);
  }
  return stripNiqqud(word).trim();
}
