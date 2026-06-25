// domain/behaviorBoards.ts — מחוללי תבניות ללוחות ויסות/התנהגות (I6). טהור.
// מספק את שכבת הנתונים (Board): First-Then ולו"ז חזותי. רכיבי טיימר/סימון "בוצע"
// הם שכבת UI (נבנים מעל התבניות הללו).

import type { Board, Cell, CellPlacement } from './models';

function speakCell(id: string, label: string): Cell {
  return { id, label, action: { type: 'speak' } };
}

/** לוח "קודם–אחר כך" (First-Then) — שני תאים בשורה אחת (RTL: "קודם" מימין). */
export function createFirstThenBoard(
  firstLabel: string,
  thenLabel: string,
  boardId = 'first-then',
): Board {
  const cells: Record<string, Cell> = {
    'ft-first': speakCell('ft-first', firstLabel),
    'ft-then': speakCell('ft-then', thenLabel),
  };
  const placements: CellPlacement[] = [
    { cellId: 'ft-first', row: 0, col: 0 }, // col=0 → הימני ביותר ב-RTL ("קודם")
    { cellId: 'ft-then', row: 0, col: 1 },
  ];
  return { id: boardId, name: 'קודם – אחר כך', grid: { rows: 1, cols: 2 }, cells, placements };
}

/** לו"ז חזותי — שלב לכל צעד, בשורה אחת לפי הסדר (RTL מימין לשמאל). */
export function createVisualScheduleBoard(steps: string[], boardId = 'schedule'): Board {
  const cells: Record<string, Cell> = {};
  const placements: CellPlacement[] = [];
  steps.forEach((label, i) => {
    const id = `step-${i}`;
    cells[id] = speakCell(id, label);
    placements.push({ cellId: id, row: 0, col: i });
  });
  return {
    id: boardId,
    name: 'לו"ז חזותי',
    grid: { rows: 1, cols: Math.max(steps.length, 1) },
    cells,
    placements,
  };
}
