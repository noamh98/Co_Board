// domain/growingVocab.ts — אוצר מילים צומח + שורת ליבה קבועה (I4). טהור.
// אינווריאנט Motor Planning: העלאת רמה חושפת תאים נוספים בלי להזיז את הקיימים —
// המיקומים (row/col) נשמרים כמות שהם; הסינון הוא על נראות בלבד.

import type { Board, Cell, CellPlacement } from './models';

export interface VisiblePlacement extends CellPlacement {
  cell: Cell;
}

/** האם מילת ליבה — תמיד גלויה, מיקום קבוע (שורת ליבה). */
export function isFrozenCore(cell: Cell): boolean {
  return cell.isCore === true;
}

/**
 * התאים הגלויים ברמה נתונה: תאי ליבה + תאים עם level <= currentLevel.
 * המיקומים נשמרים — חשיפת רמה גבוהה אינה מזיזה תאים קיימים.
 */
export function visiblePlacements(board: Board, currentLevel: number): VisiblePlacement[] {
  const out: VisiblePlacement[] = [];
  for (const p of board.placements) {
    const cell = board.cells[p.cellId];
    if (!cell || cell.hidden) continue;
    const level = cell.level ?? 0;
    if (isFrozenCore(cell) || level <= currentLevel) {
      out.push({ ...p, cell });
    }
  }
  return out;
}

/** הרמה המקסימלית בלוח (להגבלת בורר הרמה). */
export function maxLevel(board: Board): number {
  let max = 0;
  for (const cell of Object.values(board.cells)) {
    if (cell.level !== undefined && cell.level > max) max = cell.level;
  }
  return max;
}
