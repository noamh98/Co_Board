// הגדרות גישה מוטורית (Accessibility) — PRD §4.7, FR-020.
// טיפוסים בלבד (domain טהור, ללא I/O). נשמר offline ב-settingsRepo (IndexedDB).
//
// Phase 1/2 (F7): נוספו הגדרות "אמיתיות" נאמנות לאפליקציה — מניעת כפילויות ברצף,
// גודל תמונה במשבצת, וגודל כפתורי שורת הקריאה. כולן אדיטיביות עם ברירות-מחדל.

export interface AccessSettings {
  /** זמן ההשהייה להפעלה ללא לחיצה (Dwell). 0 = כבוי. */
  dwellTimeMs: number;
  /** הפעלה בשחרור המגע (Activate on Release) במקום בלחיצה. */
  activateOnRelease: boolean;
  /** מניעת מגע כפול — מסנן לחיצה שנייה מהירה בטעות. */
  doubleTapPrevention: boolean;
  /** משך אנימציית המילוי המוצגת לפני הפעלת Dwell. */
  dwellPreviewMs: number;
  /** ערכת ניגודיות גבוהה (F4) — שחור/לבן עם גבולות חזקים, שומר קוד-צבע Fitzgerald. */
  highContrast?: boolean;
  // ── פאזה I (כל הדגלים כבויים כברירת מחדל — אדיטיבי) ──
  /** I3 — סריקת מתגים פעילה. */
  scanningEnabled?: boolean;
  /** I3 — מצב סריקה. */
  scanMode?: 'linear' | 'row-column';
  /** I3 — מהירות סריקה אוטומטית (ms). 0 = ידני (מתג מקדם). */
  scanSpeedMs?: number;
  /** I3 — סריקה שמיעתית (הקראת התווית בעת הדגשה). */
  scanAuditory?: boolean;
  /** I2 — שורת ניבוי מילה הבאה פעילה. */
  predictionEnabled?: boolean;
  /** I9 — גודל תא מינימלי (px, ≥44 לנגישות WCAG). */
  cellMinPx?: number;
  // ── F7 (נאמן לאפליקציה: הגדרות תצוגה ושורת קריאה) ──
  /** מניעת כפילויות ברצף — לחיצה חוזרת על אותה מילה לא תוסיף אותה שוב לשורת הקריאה. */
  preventSequentialDuplicates?: boolean;
  /** גודל התמונה במשבצת (%). 100 = ברירת מחדל. טווח מומלץ 50–150. */
  cellImageScale?: number;
  /** גודל כפתורי שורת הקריאה (השמעה/מחיקה/ניקוי) (%). 100 = ברירת מחדל. טווח 50–200. */
  sentenceButtonScale?: number;
  // ── Phase 2 (2.3 — מערכת עיצוב / נגישות קריאה) ──
  /** C-18 — גופן קריא ידידותי-דיסלקציה (מרווח אותיות/שורות מוגדל). class .reading-font על <html>. */
  readingFont?: boolean;
  /** C-06 — ערכת "רגיעה חושית": פלטת chrome רכה/מונמכת. class .sensory-calm על <html>. */
  sensoryCalm?: boolean;
}

export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  dwellTimeMs: 0,
  activateOnRelease: false,
  doubleTapPrevention: false,
  dwellPreviewMs: 300,
  highContrast: false,
  scanningEnabled: false,
  scanMode: 'linear',
  scanSpeedMs: 1200,
  scanAuditory: true,
  predictionEnabled: false,
  cellMinPx: 92, // תואם ל-CSS (--cell-min) — מונע רגרסיה; ניתן להקטין עד 44 (WCAG).
  // F7 — ברירות-מחדל שמרניות (אין שינוי התנהגות עד שהמטפל מכוון):
  preventSequentialDuplicates: false,
  cellImageScale: 100,
  sentenceButtonScale: 100,
  // 2.3 — כבוי כברירת מחדל (אדיטיבי, opt-in):
  readingFont: false,
  sensoryCalm: false,
};
