// domain/haptics.ts — לוגיקת משוב-רטט (haptics) טהורה, ללא תלות ב-framework או ב-navigator.
// C-09 (Play-mode safety, חלק ב'): מחליט *אם* לרטוט ומהי התבנית, לפי הגדרה + זמינות.
// שכבת ה-services (services/haptics) היא זו שקוראת בפועל ל-navigator.vibrate (feature-detected).
//
// אינווריאנט: domain טהור — אין כאן גישה ל-navigator/window. אפס any.

/** אירועים שעשויים להפעיל משוב-רטט קצר. */
export type HapticEvent = 'wordAdded' | 'sentenceSpoken' | 'cleared';

/**
 * האם לרטוט? רק אם ההגדרה פעילה *וגם* המכשיר תומך.
 * שמרני בכוונה: ברירת-המחדל של hapticFeedback היא כבוי (opt-in).
 */
export function shouldVibrate(enabled: boolean, supported: boolean): boolean {
  return enabled === true && supported === true;
}

// תבניות רטט קצרות ועדינות (ms). מכוונות להיות דיסקרטיות — לא להסיח את המשתמש.
const PATTERNS: Record<HapticEvent, number | number[]> = {
  wordAdded: 12,
  sentenceSpoken: [10, 40, 10],
  cleared: 24,
};

/** מחזיר את תבנית הרטט (ms / מערך ms) עבור אירוע נתון. */
export function vibrationPattern(event: HapticEvent): number | number[] {
  return PATTERNS[event];
}
