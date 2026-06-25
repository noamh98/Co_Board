// הגדרות גישה מוטורית (Accessibility) — PRD §4.7, FR-020.
// טיפוסים בלבד (domain טהור, ללא I/O). נשמר offline ב-settingsRepo (IndexedDB).

export interface AccessSettings {
  /** זמן השהייה להפעלה ללא לחיצה (Dwell). 0 = כבוי. */
  dwellTimeMs: number;
  /** הפעלה בשחרור המגע (Activate on Release) במקום בלחיצה. */
  activateOnRelease: boolean;
  /** מניעת מגע כפול — מסנן לחיצה שנייה מהירה בטעות. */
  doubleTapPrevention: boolean;
  /** משך אנימציית המילוי המוצגת לפני הפעלת Dwell. */
  dwellPreviewMs: number;
  /** ערכת ניגודיות גבוהה (F4) — שחור/לבן עם גבולות חזקים, שומר קוד-צבע Fitzgerald. */
  highContrast?: boolean;
}

export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  dwellTimeMs: 0,
  activateOnRelease: false,
  doubleTapPrevention: false,
  dwellPreviewMs: 300,
  highContrast: false,
};
