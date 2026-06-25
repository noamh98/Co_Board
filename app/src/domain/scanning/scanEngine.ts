// domain/scanning/scanEngine.ts — מנוע סריקת מתגים (I3). טהור: מכונת-מצבים ללא timers/DOM.
// hook ה-UI (useScanning) מזין תזמון (auto) או צעד-ידני (Space/Enter/מתג) וקורא ל-advance/select.
// תמיכה: linear (תא-אחר-תא) ו-row-column (סריקת שורות → סריקת תאים בשורה).

export type ScanMode = 'linear' | 'row-column';

export interface ScanConfig {
  mode: ScanMode;
  rows: number;
  cols: number;
}

export interface ScanState {
  phase: 'linear' | 'row' | 'cell';
  row: number;
  col: number;
}

const total = (c: ScanConfig): number => c.rows * c.cols;
const indexOf = (c: ScanConfig, s: ScanState): number => s.row * c.cols + s.col;

/** מצב התחלתי לפי מצב הסריקה. */
export function initScan(c: ScanConfig): ScanState {
  return c.mode === 'linear'
    ? { phase: 'linear', row: 0, col: 0 }
    : { phase: 'row', row: 0, col: 0 };
}

/** מקדם את ההדגשה צעד אחד (auto-tick או צעד ידני). מסתובב במחזור. */
export function advance(c: ScanConfig, s: ScanState): ScanState {
  if (s.phase === 'linear') {
    const next = (indexOf(c, s) + 1) % total(c);
    return { phase: 'linear', row: Math.floor(next / c.cols), col: next % c.cols };
  }
  if (s.phase === 'row') {
    return { ...s, row: (s.row + 1) % c.rows };
  }
  // phase 'cell' — מקדם עמודה בתוך השורה הנבחרת
  return { ...s, col: (s.col + 1) % c.cols };
}

/**
 * בחירה (לחיצת מתג). linear → מחזיר את התא. row-column: שורה → צולל לסריקת תאים (selectedIndex=null);
 * תא → מאשר ומאפס לסריקת שורות.
 */
export function select(
  c: ScanConfig,
  s: ScanState,
): { state: ScanState; selectedIndex: number | null } {
  if (s.phase === 'linear') {
    return { state: s, selectedIndex: indexOf(c, s) };
  }
  if (s.phase === 'row') {
    return { state: { phase: 'cell', row: s.row, col: 0 }, selectedIndex: null };
  }
  return { state: { phase: 'row', row: s.row, col: 0 }, selectedIndex: indexOf(c, s) };
}

/** אינדקסי התאים המודגשים כעת (שורה שלמה ב-phase 'row', אחרת תא בודד). */
export function highlightedIndices(c: ScanConfig, s: ScanState): number[] {
  if (s.phase === 'row') {
    return Array.from({ length: c.cols }, (_, col) => s.row * c.cols + col);
  }
  return [indexOf(c, s)];
}
