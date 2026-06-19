import { describe, it, expect } from 'vitest';
import {
  detectPositionViolations,
  applyLayout,
  resizeGridPreservingCore,
} from './layout';
import type { Board } from './models';
import { SAMPLE_CORE_BOARD } from './sampleBoard';

function clone(board: Board): Board {
  return structuredClone(board);
}

describe('אינווריאנט Motor Planning — מילות ליבה לא זזות', () => {
  it('הזזת מילת ליבה מזוהה כהפרה', () => {
    const after = clone(SAMPLE_CORE_BOARD);
    const want = after.placements.find((p) => p.cellId === 'want')!;
    want.col = 2; // הזזת "רוצה"
    const violations = detectPositionViolations(SAMPLE_CORE_BOARD, after);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ cellId: 'want', reason: 'moved' });
  });

  it('הסרת מילת ליבה מזוהה כהפרה', () => {
    const after = clone(SAMPLE_CORE_BOARD);
    after.placements = after.placements.filter((p) => p.cellId !== 'i');
    const violations = detectPositionViolations(SAMPLE_CORE_BOARD, after);
    expect(violations).toEqual([
      expect.objectContaining({ cellId: 'i', reason: 'removed' }),
    ]);
  });

  it('הוספת תא fringe בתא ריק אינה הפרה', () => {
    const after = clone(SAMPLE_CORE_BOARD);
    after.grid = { rows: 4, cols: 3 };
    after.cells['cookie'] = {
      id: 'cookie',
      label: 'עוגייה',
      fitzgerald: 'noun',
      isCore: false,
      action: { type: 'speak' },
    };
    after.placements.push({ cellId: 'cookie', row: 3, col: 0 });
    expect(detectPositionViolations(SAMPLE_CORE_BOARD, after)).toHaveLength(0);
  });

  it('הגדלת גריד שומרת על מיקומי הליבה — אין הפרה', () => {
    const res = resizeGridPreservingCore(SAMPLE_CORE_BOARD, { rows: 5, cols: 5 });
    expect(res.applied).toBe(true);
    expect(res.violations).toHaveLength(0);
    expect(res.board.grid).toEqual({ rows: 5, cols: 5 });
  });

  it('הקטנת גריד שמוציאה מילת ליבה החוצה — הפרה, לא מוחל', () => {
    const res = resizeGridPreservingCore(SAMPLE_CORE_BOARD, { rows: 2, cols: 2 });
    expect(res.applied).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
    expect(res.violations.some((v) => v.reason === 'out-of-grid')).toBe(true);
  });

  it('applyLayout חוסם הזזת ליבה ללא אישור, ומחיל עם allowCoreMove', () => {
    const moved = clone(SAMPLE_CORE_BOARD).placements.map((p) =>
      p.cellId === 'i' ? { ...p, col: 2 } : p,
    );

    const blocked = applyLayout(SAMPLE_CORE_BOARD, { placements: moved });
    expect(blocked.applied).toBe(false);
    expect(blocked.board).toBe(SAMPLE_CORE_BOARD); // לא שונה

    const forced = applyLayout(
      SAMPLE_CORE_BOARD,
      { placements: moved },
      { allowCoreMove: true },
    );
    expect(forced.applied).toBe(true);
    expect(forced.violations.length).toBeGreaterThan(0); // עדיין מדווח
  });
});
