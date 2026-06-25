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
};
