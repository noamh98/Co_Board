import type { Board, GridSize } from './models';
import { resizeBoard } from './boardEditor';

// לוגיקת התאמה הדרגתית (Adaptivity) — PRD §4.7, FR-014/FR-015.
// טהור (immutable, ללא I/O). אינווריאנט: hidden אינו מחיקה — התא נשאר בלוח.

/** גדלי גריד מינ'/מקס' מותרים (FR-015, PRD §11.1). */
export const GRID_MIN = 2;
export const GRID_MAX = 12;

/** גודל מטרה מינ' לתא (≈1.5 ס"מ ב-96dpi). מתחת ל-CELL_WARN_PX — אזהרה; מתחת ל-CELL_BLOCK_PX — חסימה. */
export const CELL_WARN_PX = 57;   // 1.5 cm @ 96 dpi
export const CELL_BLOCK_PX = 44;  // Apple HIG minimum tap target

/**
 * מחשב גודל תא משוער בפיקסלים לוגיים לגריד נתון ומידות viewport.
 * מניח שהלוח תופס את מלוא הרוחב/גובה הזמין.
 */
export function estimateCellPx(
  rows: number,
  cols: number,
  viewportW: number,
  viewportH: number,
): { width: number; height: number } {
  return { width: viewportW / cols, height: viewportH / rows };
}

/**
 * בודק אם גודל התא המשוער קטן מדי לשימוש נגיש.
 * מחזיר 'block' אם קטן מ-CELL_BLOCK_PX, 'warn' אם בין ל-CELL_WARN_PX, 'ok' אחרת.
 */
export function cellSizeStatus(
  rows: number,
  cols: number,
  viewportW: number,
  viewportH: number,
): 'ok' | 'warn' | 'block' {
  const { width, height } = estimateCellPx(rows, cols, viewportW, viewportH);
  const minDim = Math.min(width, height);
  if (minDim < CELL_BLOCK_PX) return 'block';
  if (minDim < CELL_WARN_PX) return 'warn';
  return 'ok';
}

/** מחליף את דגל hidden של תא (חשיפה/הסתרה הדרגתית). לא מסיר את התא. */
export function toggleCellVisibility(board: Board, cellId: string): Board {
  const cell = board.cells[cellId];
  if (!cell) return board;
  return {
    ...board,
    cells: {
      ...board.cells,
      [cellId]: { ...cell, hidden: !cell.hidden },
    },
  };
}

/**
 * מחזיר לוח ללא התאים המוסתרים (למצב ילד).
 * מסיר placements + cells של hidden בלבד; מילות ליבה מוסתרות אינן מקבלות יחס מיוחד
 * (isCore אינו מונע הסתרה — ההסתרה לעולם אינה מזיזה תא נראה).
 */
export function hiddenFilter(board: Board): Board {
  const visibleCells: Board['cells'] = {};
  for (const [id, cell] of Object.entries(board.cells)) {
    if (!cell.hidden) visibleCells[id] = cell;
  }
  return {
    ...board,
    cells: visibleCells,
    placements: board.placements.filter((p) => !board.cells[p.cellId]?.hidden),
  };
}

/**
 * שינוי גודל גריד דינמי (FR-015) תוך שמירת מילות הליבה.
 * עוטף resizeBoard — ViolationError מתפשט החוצה אם ליבה נופלת מחוץ לגריד החדש,
 * וה-UI אחראי להציג אזהרה (GridSizePicker).
 */
export function applyCellSize(board: Board, newGrid: GridSize): Board {
  return resizeBoard(board, newGrid);
}
