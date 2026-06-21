import { describe, it, expect } from 'vitest';
import {
  createModelingSession,
  toggleHighlight,
  clearHighlights,
} from './modelingSession';

describe('modelingSession (M13)', () => {
  it('createModelingSession — activeHighlights ריק', () => {
    const s = createModelingSession();
    expect(s.activeHighlights.size).toBe(0);
  });

  it('toggleHighlight מוסיף id; toggleHighlight שוב מסיר (toggle)', () => {
    const s0 = createModelingSession();
    const s1 = toggleHighlight(s0, 'cell-1');
    expect(s1.activeHighlights.has('cell-1')).toBe(true);
    const s2 = toggleHighlight(s1, 'cell-1');
    expect(s2.activeHighlights.has('cell-1')).toBe(false);
  });

  it('clearHighlights מחזיר set ריק', () => {
    let s = toggleHighlight(createModelingSession(), 'a');
    s = toggleHighlight(s, 'b');
    expect(clearHighlights(s).activeHighlights.size).toBe(0);
  });

  it('immutability — toggleHighlight לא משנה session מקורי', () => {
    const s0 = createModelingSession();
    toggleHighlight(s0, 'x');
    expect(s0.activeHighlights.size).toBe(0);
  });
});
