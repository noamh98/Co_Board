import { describe, it, expect } from 'vitest';
import { createFirstThenBoard, createVisualScheduleBoard } from './behaviorBoards';

describe('behaviorBoards — I6', () => {
  it('First-Then — שני תאים בשורה אחת', () => {
    const b = createFirstThenBoard('לשבת', 'משחק');
    expect(b.grid).toEqual({ rows: 1, cols: 2 });
    expect(b.cells['ft-first'].label).toBe('לשבת');
    expect(b.cells['ft-then'].label).toBe('משחק');
    expect(b.placements).toHaveLength(2);
  });

  it('לו"ז חזותי — תא לכל צעד לפי הסדר', () => {
    const b = createVisualScheduleBoard(['בוקר', 'ארוחה', 'גן']);
    expect(b.grid.cols).toBe(3);
    expect(Object.keys(b.cells)).toHaveLength(3);
    expect(b.placements.map((p) => p.col)).toEqual([0, 1, 2]);
    expect(b.cells['step-1'].label).toBe('ארוחה');
  });
});
