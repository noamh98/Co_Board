// Word Finder — FR-029 (PRD §4.4, Phase 2).
// BFS מלוח הבית לכל לוח ניתן-לגישה. מחזיר נתיב לחיצות עד לתא עם label תואם.

import type { Board } from '../../domain/models';

export interface CellPathStep {
  boardId: string;
  boardName: string;
  cellId: string;
  label: string;
}

export type CellPath = CellPathStep[];

/**
 * BFS מ-homeId לתא שה-label שלו מתאים (השוואה case-insensitive, trim).
 * מחזיר null אם לא נמצא.
 */
export function findPath(
  targetLabel: string,
  boards: Record<string, Board>,
  homeId: string,
): CellPath | null {
  const needle = targetLabel.trim().toLowerCase();
  if (!needle) return null;

  if (!boards[homeId]) return null;

  // כל צומת BFS: { boardId, path עד כאן }
  type Node = { boardId: string; path: CellPathStep[] };

  const queue: Node[] = [{ boardId: homeId, path: [] }];
  const visited = new Set<string>([homeId]);

  while (queue.length > 0) {
    const { boardId, path } = queue.shift()!;
    const board = boards[boardId];
    if (!board) continue;

    for (const cell of Object.values(board.cells)) {
      if (cell.hidden) continue;

      const step: CellPathStep = {
        boardId,
        boardName: board.name,
        cellId: cell.id,
        label: cell.label,
      };

      if (cell.label.trim().toLowerCase() === needle) {
        return [...path, step];
      }

      if (cell.action.type === 'navigate') {
        const nextId = cell.action.targetBoardId;
        if (!visited.has(nextId) && boards[nextId]) {
          visited.add(nextId);
          queue.push({ boardId: nextId, path: [...path, step] });
        }
      }
    }
  }

  return null;
}
