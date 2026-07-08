// services/haptics/hapticsService.ts — עטיפת I/O ל-navigator.vibrate.
// C-09 (חלק ב'): משוב-רטט feature-detected + מגודר-הגדרות. ההחלטה הטהורה ב-domain/haptics.
//
// אינווריאנט: לעולם לא חוסם — קריאה fire-and-forget, לא מעכבת "לחיצה ראשונה מדברת".
// המכשירים שאינם תומכים (iOS Safari וכו') פשוט לא מרטטים, ללא שגיאה.

import { shouldVibrate, vibrationPattern, type HapticEvent } from '../../domain/haptics';

/** האם ה-runtime הנוכחי תומך ב-navigator.vibrate. */
export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * מפעיל משוב-רטט קצר עבור אירוע — אם ההגדרה פעילה וגם יש תמיכה.
 * @param enabled ערך hapticFeedback מ-AccessSettings.
 * @param event סוג האירוע (wordAdded / sentenceSpoken / cleared).
 */
export function triggerHaptic(enabled: boolean, event: HapticEvent): void {
  if (!shouldVibrate(enabled, isHapticsSupported())) return;
  try {
    navigator.vibrate(vibrationPattern(event));
  } catch {
    // חלק מהדפדפנים זורקים ב-contexts מסוימים — מתעלמים בשקט (לא חוסם UX).
  }
}
