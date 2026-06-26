// M20 — מפת מילה→ARASAAC pictogram id, עם נתיב מקומי (offline-first).
// בסיס: symbolMap.generated.ts (אוטומטי מ-ARASAAC). מעליו OVERRIDES — תיקוני אימות ידני
// (PRD §4.2 "אימות אנושי"): סמלים שהאוטומט בחר שגוי, או מילים שדרשו חיפוש אנגלי.
// סמלים נארזים מקומית ב-public/symbols/{id}.png ע"י scripts/build-symbol-map.mjs.

import { GENERATED_SYMBOL_MAP } from './symbolMap.generated';

/** תיקוני אימות ידני מעל המפה האוטומטית. */
const SYMBOL_OVERRIDES: Record<string, number> = {
  רוצה: 5441, // היה 10369 (כפילות שגויה עם "מה") → לרצות/אני רוצה
  רועש: 24833, // היה 7157 (כפילות עם "מפריע") → להרעיש/רעש
  כואב: 30620, // חסר ב-he → hurt/pain (חיפוש אנגלי)
  'כואב לי': 30620,
  ספרייה: 6063, // חסר ב-he → library
  איך: 22619, // חסר ב-he → how
  במבה: 24854, // אין במבה ספציפי → סמל חטיף גנרי
  ביסלי: 4694, // אין ביסלי ספציפי → סמל חטיף גנרי
  // iPad — נשאר ללא סמל (label בלבד); אין פיקטוגרמה הולמת.
  'אוכל': 4610,   // food category nav cell
  'רגשות': 12359, // emotions category nav cell
  // 'משחק': 9813 — כבר ב-GENERATED_SYMBOL_MAP
  'משפחה': 5532,  // family category — ARASAAC family group
  'כאב': 30620,   // pain/hurt — same as כואב
  'שגרת': 6012,   // היה 3155 (כיסא — שגוי) → לוח שבועי/תזמון
  'אוצר': 4788,   // vocabulary/words
  'אוהב': 8020,   // היה 31760 (פנים עם X — שגוי) → לב/אהבה
  'את/ה': 6625,   // היה 12311 (פיצה — שגוי) → אצבע מצביעה/אתה
};

export const SYMBOL_MAP: Record<string, number> = {
  ...GENERATED_SYMBOL_MAP,
  ...SYMBOL_OVERRIDES,
};

/** מחזיר ARASAAC id למילה (label, ללא ניקוד), או undefined אם אין מיפוי. */
export function symbolIdFor(label: string): number | undefined {
  return SYMBOL_MAP[label.trim()];
}

/** נתיב מקומי לפיקטוגרמה (נארז ב-public, precache ע"י Workbox — אופליין מלא). */
export function localSymbolPath(id: number): string {
  return `${import.meta.env.BASE_URL}symbols/${id}.png`;
}
