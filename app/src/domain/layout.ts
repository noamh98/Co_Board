import type { Board, CellPlacement, GridSize } from './models';

/**
 * אינווריאנט קריטי (HANDOFF §4, PRD §1.5 / §4.1):
 * מילות ליבה (isCore) **לא זזות** ממיקומן לאורך התפתחות הילד (Motor Planning).
 * הרחבה נעשית *סביב* המבנה הקיים. כל פעולה שתזיז/תסיר מילת ליבה מחייבת
 * אזהרה + אישור מפורש (allowCoreMove) — כולל שינויים אוטומטיים/AI (אינווריאנט §7).
 *
 * מודול זה אינו עושה I/O — לוגיקה טהורה ובדיקה (testable).
 */

export interface PositionViolation {
  cellId: string;
  label: string;
  from: { row: number; col: number };
  /** היעד החדש, או null אם התא הוסר/נפל מחוץ לגריד. */
  to: { row: number; col: number } | null;
  reason: 'moved' | 'removed' | 'out-of-grid';
}

function placementMap(placements: CellPlacement[]): Map<string, CellPlacement> {
  return new Map(placements.map((p) => [p.cellId, p]));
}

function isCore(board: Board, cellId: string): boolean {
  return board.cells[cellId]?.isCore === true;
}

/**
 * משווה פריסה "לפני" ל"אחרי" ומחזיר את כל ההפרות של עקביות מיקום מילות ליבה.
 * רשימה ריקה = הפעולה בטוחה (לא הזיזה אף מילת ליבה).
 */
export function detectPositionViolations(
  before: Board,
  after: Board,
): PositionViolation[] {
  const beforeMap = placementMap(before.placements);
  const afterMap = placementMap(after.placements);
  const violations: PositionViolation[] = [];

  for (const [cellId, from] of beforeMap) {
    if (!isCore(before, cellId)) continue; // רק מילות ליבה כפופות לאינווריאנט

    const to = afterMap.get(cellId);
    const label = before.cells[cellId]?.label ?? cellId;

    if (!to) {
      violations.push({ cellId, label, from, to: null, reason: 'removed' });
      continue;
    }
    const outOfGrid =
      to.row < 0 ||
      to.col < 0 ||
      to.row >= after.grid.rows ||
      to.col >= after.grid.cols;
    if (outOfGrid) {
      violations.push({
        cellId,
        label,
        from,
        to: { row: to.row, col: to.col },
        reason: 'out-of-grid',
      });
      continue;
    }
    if (to.row !== from.row || to.col !== from.col) {
      violations.push({
        cellId,
        label,
        from,
        to: { row: to.row, col: to.col },
        reason: 'moved',
      });
    }
  }

  return violations;
}

export interface ApplyResult {
  board: Board;
  violations: PositionViolation[];
  /** האם הפריסה החדשה הוחלה בפועל. */
  applied: boolean;
}

/**
 * מחיל פריסה חדשה על לוח, תוך אכיפת האינווריאנט.
 * אם יש הפרות ו-`allowCoreMove` אינו אמת — הפריסה **לא** מוחלת (applied=false),
 * וה-UI חייב להציג אזהרה לפני שיקרא שוב עם allowCoreMove=true.
 */
export function applyLayout(
  board: Board,
  next: { grid?: GridSize; placements: CellPlacement[] },
  opts: { allowCoreMove?: boolean } = {},
): ApplyResult {
  const candidate: Board = {
    ...board,
    grid: next.grid ?? board.grid,
    placements: next.placements,
  };
  const violations = detectPositionViolations(board, candidate);

  if (violations.length > 0 && !opts.allowCoreMove) {
    return { board, violations, applied: false };
  }
  return { board: candidate, violations, applied: true };
}

/**
 * שינוי גודל גריד תוך *שימור* מיקום מילות הליבה (PRD §4.1: מעבר בין גדלים
 * ללא בנייה מחדש, בלי להזיז ליבה). מחזיר הפרות אם מילת ליבה לא נכנסת בגריד החדש.
 */
export function resizeGridPreservingCore(
  board: Board,
  newGrid: GridSize,
): ApplyResult {
  // המיקומים נשמרים כפי שהם; רק הגריד משתנה. תאים שנופלים מחוץ לגריד יזוהו.
  return applyLayout(board, { grid: newGrid, placements: board.placements });
}
