// domain/playSafety.ts — לוגיקת בטיחות מצב-משחק (Play-mode safety) טהורה.
// C-09 (חלק א'): אישור-לפני-ניקוי לשורת המשפט — מונע מחיקה בשוגג של כל המשפט.
//
// אינווריאנט: domain טהור, ללא I/O. אפס any.

/**
 * האם להציג דיאלוג אישור לפני ניקוי שורת המשפט?
 * - כברירת-מחדל (undefined) מתייחסים כאילו פעיל (true) — לבטיחות מירבית עבור קטינים.
 * - אין טעם להציג אישור כשאין מילים לנקות.
 *
 * @param confirmBeforeClear ההגדרה מ-AccessSettings (עשויה להיות undefined בנתונים ישנים).
 * @param hasWords האם קיימות מילים בשורת המשפט.
 */
export function shouldConfirmClear(
  confirmBeforeClear: boolean | undefined,
  hasWords: boolean,
): boolean {
  return (confirmBeforeClear ?? true) && hasWords;
}
