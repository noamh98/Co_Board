import type { Board, GridSize } from './models';
import { resizeBoard } from './boardEditor';

// לוגיקת התאמה הדרגתית (Adaptivity) — PRD §4.7, FR-014/FR-015.
// טהור (immutable, ללא I/O). אינווריאנט: hidden אינו מחיקה — התא נשאר בלוח.

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
