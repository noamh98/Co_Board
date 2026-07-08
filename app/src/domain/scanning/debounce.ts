// domain/scanning/debounce.ts — מגן דחיית-קלט (debounce) טהור למתג סריקה (C-15).
// מונע הפעלה כפולה בשוגג של מתג פיזי עקב רעד (tremor): קלט שני בתוך חלון-הזמן נדחה.
// טהור — ללא DOM/טיימרים; המתקשר מזרים now (Date.now/performance.now) ומקבל state חדש.
// אינווריאנט: הקלט הראשון תמיד מתקבל ("לחיצה ראשונה מדברת" נשמרת).

export interface DebounceGuard {
  /** חותמת-הזמן (ms) של הקלט האחרון שהתקבל, או null אם טרם התקבל קלט. */
  readonly lastAcceptedAt: number | null;
}

export function createDebounceGuard(): DebounceGuard {
  return { lastAcceptedAt: null };
}

export interface DebounceResult {
  readonly guard: DebounceGuard;
  readonly accepted: boolean;
}

/**
 * מחליט אם לקבל קלט מתג בזמן now.
 * מקבל (ומעדכן את המונה) אם: debounceMs<=0, זהו הקלט הראשון,
 * חלף לפחות debounceMs מאז הקלט הקודם, או שהשעון נסוג (now<last — הגנת נסיגת שעון).
 * אחרת דוחה ומשאיר את המונה ללא שינוי.
 */
export function acceptInput(
  guard: DebounceGuard,
  now: number,
  debounceMs: number,
): DebounceResult {
  const last = guard.lastAcceptedAt;
  const accept =
    debounceMs <= 0 || last === null || now < last || now - last >= debounceMs;
  if (accept) {
    return { guard: { lastAcceptedAt: now }, accepted: true };
  }
  return { guard, accepted: false };
}
