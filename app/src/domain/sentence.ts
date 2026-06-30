// domain/sentence.ts — לוגיקת שורת-הקריאה (טהורה, ללא I/O). Phase 1/2 (F7).
// מניעת-כפילויות ברצף: לחיצה חוזרת על אותה מילה לא מוסיפה אותה שוב לשורה.
// מופרד מ-App.tsx כדי להיות בר-בדיקה (reducer-guard קצר, Ponytail).

import type { Cell } from './models';

/** המילה היחודית לזיהוי כפילות — vocalization > nikud > label (אותה היררכיה כמו ההקראה). */
function wordKey(cell: Cell): string {
  return cell.vocalization ?? cell.nikud ?? cell.label;
}

/**
 * מוסיף תא לשורת הקריאה. אם preventDuplicates=true והמילה האחרונה זהה — מחזיר את השורה
 * ללא שינוי (לא מוסיף כפילות). אחרת מצרף בסוף.
 */
export function appendWord(
  sentence: Cell[],
  cell: Cell,
  preventDuplicates = false,
): Cell[] {
  if (preventDuplicates && sentence.length > 0) {
    const last = sentence[sentence.length - 1];
    if (wordKey(last) === wordKey(cell)) return sentence;
  }
  return [...sentence, cell];
}
