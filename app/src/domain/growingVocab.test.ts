import { describe, it, expect } from 'vitest';
import type { Board } from './models';
import { visiblePlacements, maxLevel } from './growingVocab';

const board: Board = {
  id: 'b1',
  name: 'צומח',
  grid: { rows: 2, cols: 3 },
  cells: {
    core: { id: 'core', label: 'אני', isCore: true, action: { type: 'speak' } },
    l0: { id: 'l0', label: 'כן', level: 0, action: { type: 'speak' } },
    l1: { id: 'l1', label: 'רוצה', level: 1, action: { type: 'speak' } },
    l2: { id: 'l2', label: 'בבקשה', level: 2, action: { type: 'speak' } },
  },
  placements: [
    { cellId: 'core', row: 0, col: 0 },
    { cellId: 'l0', row: 0, col: 1 },
    { cellId: 'l1', row: 0, col: 2 },
    { cellId: 'l2', row: 1, col: 0 },
  ],
};

describe('growingVocab — I4', () => {
  it('רמה 0 — ליבה + תאי רמה 0 בלבד', () => {
    const v = visiblePlacements(board, 0).map((p) => p.cellId);
    expect(v).toContain('core');
    expect(v).toContain('l0');
    expect(v).not.toContain('l1');
    expect(v).not.toContain('l2');
  });

  it('העלאת רמה חושפת בלי להזיז (אי-תזוזה)', () => {
    const at1 = visiblePlacements(board, 1);
    const at2 = visiblePlacements(board, 2);
    // התא l1 גלוי בשתי הרמות — באותו מיקום בדיוק
    const p1 = at1.find((p) => p.cellId === 'l1')!;
    const p2 = at2.find((p) => p.cellId === 'l1')!;
    expect({ row: p1.row, col: p1.col }).toEqual({ row: p2.row, col: p2.col });
    // רמה 2 מוסיפה את l2 מבלי לשנות את שאר המיקומים
    expect(at2.map((p) => p.cellId)).toContain('l2');
    const core1 = at1.find((p) => p.cellId === 'core')!;
    const core2 = at2.find((p) => p.cellId === 'core')!;
    expect({ row: core1.row, col: core1.col }).toEqual({ row: core2.row, col: core2.col });
  });

  it('maxLevel מחזיר את הרמה הגבוהה ביותר', () => {
    expect(maxLevel(board)).toBe(2);
  });
});
