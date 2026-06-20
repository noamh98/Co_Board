import { describe, it, expect } from 'vitest';
import type { Board, Cell } from './models';
import { toggleCellVisibility, hiddenFilter, applyCellSize } from './adaptivity';
import { ViolationError } from './boardEditor';

function cell(id: string, partial: Partial<Cell> = {}): Cell {
  return { id, label: id, action: { type: 'speak' }, ...partial };
}

function board(): Board {
  return {
    id: 'b',
    name: 'test',
    grid: { rows: 2, cols: 2 },
    cells: {
      a: cell('a', { isCore: true }),
      b: cell('b', { isCore: true }),
      c: cell('c', { hidden: true }),
    },
    placements: [
      { cellId: 'a', row: 0, col: 0 },
      { cellId: 'b', row: 0, col: 1 },
      { cellId: 'c', row: 1, col: 0 },
    ],
  };
}

describe('toggleCellVisibility', () => {
  it('hidden↔visible', () => {
    const b = board();
    const hidden = toggleCellVisibility(b, 'b');
    expect(hidden.cells['b'].hidden).toBe(true);
    const visible = toggleCellVisibility(hidden, 'b');
    expect(visible.cells['b'].hidden).toBe(false);
  });

  it('תא ליבה ניתן להסתרה (לא מחיקה)', () => {
    const b = toggleCellVisibility(board(), 'a');
    expect(b.cells['a'].hidden).toBe(true);
    expect(b.cells['a']).toBeDefined(); // עדיין קיים — הוסתר, לא נמחק
    expect(b.placements.find((p) => p.cellId === 'a')).toBeDefined();
  });

  it('immutable — לא משנה את המקור', () => {
    const b = board();
    toggleCellVisibility(b, 'b');
    expect(b.cells['b'].hidden).toBeUndefined();
  });

  it('תא לא קיים — מחזיר ללא שינוי', () => {
    const b = board();
    expect(toggleCellVisibility(b, 'nope')).toBe(b);
  });
});

describe('hiddenFilter', () => {
  it('מסיר hidden, שומר visible', () => {
    const b = hiddenFilter(board());
    expect(b.cells['a']).toBeDefined();
    expect(b.cells['b']).toBeDefined();
    expect(b.cells['c']).toBeUndefined();
    expect(b.placements.map((p) => p.cellId).sort()).toEqual(['a', 'b']);
  });

  it('hidden core מוסר ממצב ילד', () => {
    const b = toggleCellVisibility(board(), 'a');
    const filtered = hiddenFilter(b);
    expect(filtered.cells['a']).toBeUndefined();
  });
});

describe('applyCellSize', () => {
  it('מגדיל גריד — ליבה נשארת במקום', () => {
    const b = applyCellSize(board(), { rows: 3, cols: 3 });
    expect(b.grid).toEqual({ rows: 3, cols: 3 });
    expect(b.placements.find((p) => p.cellId === 'a')).toMatchObject({ row: 0, col: 0 });
  });

  it('הקטנה שמפילה ליבה — זורקת ViolationError', () => {
    expect(() => applyCellSize(board(), { rows: 1, cols: 1 })).toThrow(ViolationError);
  });
});
