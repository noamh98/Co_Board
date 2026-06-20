import { describe, it, expect, beforeEach } from 'vitest';
import type { Board, Cell, CellPlacement } from './models';
import { SAMPLE_CORE_BOARD } from './sampleBoard';
import {
  ViolationError,
  addCell,
  removeCell,
  moveCell,
  resizeBoard,
  UndoStack,
} from './boardEditor';

// Minimal board with no core cells for safe mutation tests
function makeSimpleBoard(): Board {
  return {
    id: 'test-board',
    name: 'Test Board',
    grid: { rows: 3, cols: 3 },
    cells: {
      apple: {
        id: 'apple',
        label: 'תפוח',
        fitzgerald: 'noun',
        isCore: false,
        action: { type: 'speak' },
      },
      ball: {
        id: 'ball',
        label: 'כדור',
        fitzgerald: 'noun',
        isCore: false,
        action: { type: 'speak' },
      },
    },
    placements: [
      { cellId: 'apple', row: 0, col: 0 },
      { cellId: 'ball', row: 0, col: 1 },
    ],
  };
}

function makeNewCell(id: string, label: string, isCore = false): Cell {
  return {
    id,
    label,
    fitzgerald: 'noun',
    isCore,
    action: { type: 'speak' },
  };
}

// ─── addCell ────────────────────────────────────────────────────────────────

describe('addCell', () => {
  it('adds a new cell to an empty slot and returns a new board', () => {
    const board = makeSimpleBoard();
    const cell = makeNewCell('cat', 'חתול');
    const placement: CellPlacement = { cellId: 'cat', row: 1, col: 0 };

    const next = addCell(board, cell, placement);

    expect(next).not.toBe(board); // immutable — new reference
    expect(next.cells['cat']).toEqual(cell);
    expect(next.placements).toContainEqual(placement);
    // Original board unchanged
    expect(board.cells['cat']).toBeUndefined();
  });

  it('throws when placement slot is already occupied', () => {
    const board = makeSimpleBoard();
    const cell = makeNewCell('cat', 'חתול');
    // row 0, col 0 is already taken by 'apple'
    expect(() => addCell(board, cell, { cellId: 'cat', row: 0, col: 0 })).toThrow(Error);
  });
});

// ─── removeCell ─────────────────────────────────────────────────────────────

describe('removeCell', () => {
  it('removes a non-core cell — cell gone from cells dict and placements', () => {
    const board = makeSimpleBoard();
    const next = removeCell(board, 'apple');

    expect(next).not.toBe(board);
    expect(next.cells['apple']).toBeUndefined();
    expect(next.placements.find((p) => p.cellId === 'apple')).toBeUndefined();
    // Other cells untouched
    expect(next.cells['ball']).toBeDefined();
  });

  it('throws ViolationError when removing a core cell without allowCoreMove', () => {
    expect(() => removeCell(SAMPLE_CORE_BOARD, 'i')).toThrowError(ViolationError);
    try {
      removeCell(SAMPLE_CORE_BOARD, 'want');
    } catch (e) {
      expect(e).toBeInstanceOf(ViolationError);
      expect((e as ViolationError).violations[0]).toMatchObject({
        cellId: 'want',
        reason: 'removed',
      });
    }
  });

  it('removes a core cell when allowCoreMove=true', () => {
    const next = removeCell(SAMPLE_CORE_BOARD, 'i', { allowCoreMove: true });
    expect(next.cells['i']).toBeUndefined();
    expect(next.placements.find((p) => p.cellId === 'i')).toBeUndefined();
  });
});

// ─── moveCell ───────────────────────────────────────────────────────────────

describe('moveCell', () => {
  it('moves a non-core cell to an empty slot', () => {
    const board = makeSimpleBoard();
    const next = moveCell(board, 'apple', { cellId: 'apple', row: 2, col: 2 });

    expect(next).not.toBe(board);
    const placement = next.placements.find((p) => p.cellId === 'apple');
    expect(placement).toEqual({ cellId: 'apple', row: 2, col: 2 });
  });

  it('displaces cell at target slot — displaced cell stays in cells dict but loses placement', () => {
    const board = makeSimpleBoard();
    // Move 'apple' (0,0) to (0,1) where 'ball' currently is
    const next = moveCell(board, 'apple', { cellId: 'apple', row: 0, col: 1 });

    expect(next.cells['ball']).toBeDefined(); // still in dict
    expect(next.placements.find((p) => p.cellId === 'ball')).toBeUndefined(); // no longer placed
    expect(next.placements.find((p) => p.cellId === 'apple')).toEqual({
      cellId: 'apple',
      row: 0,
      col: 1,
    });
  });

  it('throws ViolationError when moving a core cell without allowCoreMove', () => {
    expect(() =>
      moveCell(SAMPLE_CORE_BOARD, 'i', { cellId: 'i', row: 2, col: 2 }),
    ).toThrowError(ViolationError);

    try {
      moveCell(SAMPLE_CORE_BOARD, 'want', { cellId: 'want', row: 1, col: 2 });
    } catch (e) {
      expect(e).toBeInstanceOf(ViolationError);
      expect((e as ViolationError).violations[0]).toMatchObject({
        cellId: 'want',
        reason: 'moved',
      });
    }
  });

  it('moves a core cell when allowCoreMove=true', () => {
    const next = moveCell(
      SAMPLE_CORE_BOARD,
      'i',
      { cellId: 'i', row: 2, col: 2 },
      { allowCoreMove: true },
    );
    const placement = next.placements.find((p) => p.cellId === 'i');
    expect(placement).toEqual({ cellId: 'i', row: 2, col: 2 });
  });
});

// ─── resizeBoard ────────────────────────────────────────────────────────────

describe('resizeBoard', () => {
  it('grows the grid without moving core cells — no violation', () => {
    const next = resizeBoard(SAMPLE_CORE_BOARD, { rows: 5, cols: 5 });
    expect(next.grid).toEqual({ rows: 5, cols: 5 });
    // All core placements preserved
    const iPlacement = next.placements.find((p) => p.cellId === 'i');
    expect(iPlacement).toEqual({ cellId: 'i', row: 0, col: 0 });
  });

  it('throws ViolationError when shrinking grid forces a core cell out of bounds', () => {
    // SAMPLE_CORE_BOARD is 3x3; shrink to 2x2 — cells at col=2 or row=2 are out
    expect(() => resizeBoard(SAMPLE_CORE_BOARD, { rows: 2, cols: 2 })).toThrowError(ViolationError);

    try {
      resizeBoard(SAMPLE_CORE_BOARD, { rows: 2, cols: 2 });
    } catch (e) {
      expect(e).toBeInstanceOf(ViolationError);
      expect((e as ViolationError).violations.length).toBeGreaterThan(0);
      expect((e as ViolationError).violations[0].reason).toBe('out-of-grid');
    }
  });

  it('drops non-core placements that fall outside new grid, keeps them in cells dict', () => {
    const board = makeSimpleBoard(); // 3x3, apple(0,0), ball(0,1)
    // Add a non-core cell at (2,2)
    const cellFar = makeNewCell('far', 'רחוק');
    const boardWithFar = addCell(board, cellFar, { cellId: 'far', row: 2, col: 2 });

    // Shrink to 2x2 — 'far' at (2,2) is now out of bounds
    const next = resizeBoard(boardWithFar, { rows: 2, cols: 2 });
    expect(next.cells['far']).toBeDefined(); // still in cells dict
    expect(next.placements.find((p) => p.cellId === 'far')).toBeUndefined(); // placement dropped
  });
});

// ─── UndoStack ──────────────────────────────────────────────────────────────

describe('UndoStack', () => {
  let stack: UndoStack<number>;

  beforeEach(() => {
    stack = new UndoStack(0);
  });

  it('current() returns the initial state', () => {
    expect(stack.current()).toBe(0);
  });

  it('push / undo / redo basic flow', () => {
    stack.push(1);
    stack.push(2);
    expect(stack.current()).toBe(2);

    expect(stack.undo()).toBe(1);
    expect(stack.current()).toBe(1);

    expect(stack.undo()).toBe(0);
    expect(stack.current()).toBe(0);

    expect(stack.redo()).toBe(1);
    expect(stack.current()).toBe(1);

    expect(stack.redo()).toBe(2);
    expect(stack.current()).toBe(2);
  });

  it('canUndo / canRedo reflect stack position', () => {
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);

    stack.push(1);
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);

    stack.undo();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(true);
  });

  it('undo at beginning returns undefined', () => {
    expect(stack.undo()).toBeUndefined();
    expect(stack.current()).toBe(0); // pointer unchanged
  });

  it('redo at end returns undefined', () => {
    stack.push(1);
    expect(stack.redo()).toBeUndefined();
    expect(stack.current()).toBe(1);
  });

  it('max 50 states enforced — oldest entries are dropped', () => {
    // Push 51 more states on top of initial(0): total would be 52, trimmed to 50.
    // After trim, history holds values [2, 3, …, 51] (50 entries; 0 and 1 dropped).
    for (let i = 1; i <= 51; i++) {
      stack.push(i);
    }
    expect(stack.current()).toBe(51);
    expect(stack.canUndo()).toBe(true);

    // Undo all the way to the oldest kept state
    let val: number | undefined = stack.current();
    while (stack.canUndo()) {
      val = stack.undo() as number;
    }
    // Oldest kept entry is 2 (0 and 1 were evicted to stay within 50)
    expect(val).toBe(2);
    expect(stack.canUndo()).toBe(false);
  });

  it('push after undo discards redo history', () => {
    stack.push(1);
    stack.push(2);
    stack.push(3);

    stack.undo(); // back to 2
    stack.undo(); // back to 1

    stack.push(99); // branch — future (2, 3) is gone

    expect(stack.canRedo()).toBe(false);
    expect(stack.current()).toBe(99);
    expect(stack.redo()).toBeUndefined();
  });
});
