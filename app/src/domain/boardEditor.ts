import type { Board, Cell, CellPlacement, GridSize } from './models';
import { resizeGridPreservingCore } from './layout';
import type { PositionViolation } from './layout';

export class ViolationError extends Error {
  constructor(public readonly violations: PositionViolation[]) {
    super(`Motor Planning violation: core cell(s) would move`);
    this.name = 'ViolationError';
  }
}

export function addCell(board: Board, cell: Cell, placement: CellPlacement): Board {
  const conflict = board.placements.find(
    (p) => p.row === placement.row && p.col === placement.col,
  );
  if (conflict) {
    throw new Error(
      `Placement (${placement.row},${placement.col}) is already occupied by cell "${conflict.cellId}"`,
    );
  }
  return {
    ...board,
    cells: { ...board.cells, [cell.id]: cell },
    placements: [...board.placements, { ...placement, cellId: cell.id }],
  };
}

export function removeCell(
  board: Board,
  cellId: string,
  opts: { allowCoreMove?: boolean } = {},
): Board {
  const cell = board.cells[cellId];
  if (cell?.isCore && !opts.allowCoreMove) {
    const placement = board.placements.find((p) => p.cellId === cellId);
    const violations: PositionViolation[] = [
      {
        cellId,
        label: cell.label,
        from: placement ? { row: placement.row, col: placement.col } : { row: -1, col: -1 },
        to: null,
        reason: 'removed',
      },
    ];
    throw new ViolationError(violations);
  }
  const { [cellId]: _removed, ...remainingCells } = board.cells;
  return {
    ...board,
    cells: remainingCells,
    placements: board.placements.filter((p) => p.cellId !== cellId),
  };
}

export function moveCell(
  board: Board,
  cellId: string,
  newPlacement: CellPlacement,
  opts: { allowCoreMove?: boolean } = {},
): Board {
  const cell = board.cells[cellId];
  if (!cell) {
    throw new Error(`Cell "${cellId}" not found`);
  }

  if (cell.isCore && !opts.allowCoreMove) {
    const from = board.placements.find((p) => p.cellId === cellId);
    const violations: PositionViolation[] = [
      {
        cellId,
        label: cell.label,
        from: from ? { row: from.row, col: from.col } : { row: -1, col: -1 },
        to: { row: newPlacement.row, col: newPlacement.col },
        reason: 'moved',
      },
    ];
    throw new ViolationError(violations);
  }

  // Remove any existing cell at the target placement (displaced cell stays in cells dict)
  const placementsWithoutTarget = board.placements.filter(
    (p) => !(p.row === newPlacement.row && p.col === newPlacement.col),
  );
  // Remove the cell's current placement, then add it at the new position
  const placementsWithoutCell = placementsWithoutTarget.filter((p) => p.cellId !== cellId);

  return {
    ...board,
    placements: [
      ...placementsWithoutCell,
      { cellId, row: newPlacement.row, col: newPlacement.col },
    ],
  };
}

export function resizeBoard(board: Board, newGrid: GridSize): Board {
  const result = resizeGridPreservingCore(board, newGrid);

  if (!result.applied && result.violations.length > 0) {
    throw new ViolationError(result.violations);
  }

  // Drop placements for non-core cells that fall outside the new grid
  const trimmedPlacements = result.board.placements.filter((p) => {
    if (p.row >= newGrid.rows || p.col >= newGrid.cols) {
      // Core cells already caught above; non-core are silently dropped
      return false;
    }
    return true;
  });

  return {
    ...result.board,
    placements: trimmedPlacements,
  };
}

const MAX_UNDO = 50;

export class UndoStack<T> {
  private history: T[];
  private pointer: number;

  constructor(initial: T) {
    this.history = [initial];
    this.pointer = 0;
  }

  push(state: T): void {
    // Discard redo history past current pointer
    this.history = this.history.slice(0, this.pointer + 1);
    this.history.push(state);
    this.pointer = this.history.length - 1;
    // Trim to max 50 states (keep current + 49 history entries = 50 total)
    if (this.history.length > MAX_UNDO) {
      const excess = this.history.length - MAX_UNDO;
      this.history = this.history.slice(excess);
      this.pointer = this.history.length - 1;
    }
  }

  undo(): T | undefined {
    if (this.pointer === 0) return undefined;
    this.pointer -= 1;
    return this.history[this.pointer];
  }

  redo(): T | undefined {
    if (this.pointer === this.history.length - 1) return undefined;
    this.pointer += 1;
    return this.history[this.pointer];
  }

  current(): T {
    return this.history[this.pointer];
  }

  canUndo(): boolean {
    return this.pointer > 0;
  }

  canRedo(): boolean {
    return this.pointer < this.history.length - 1;
  }
}
