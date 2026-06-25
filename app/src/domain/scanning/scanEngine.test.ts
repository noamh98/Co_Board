import { describe, it, expect } from 'vitest';
import { initScan, advance, select, highlightedIndices, type ScanConfig } from './scanEngine';

describe('scanEngine — I3', () => {
  const linear: ScanConfig = { mode: 'linear', rows: 2, cols: 3 };
  const rc: ScanConfig = { mode: 'row-column', rows: 2, cols: 3 };

  it('linear: מדגיש תא-אחר-תא ומסתובב', () => {
    let s = initScan(linear);
    expect(highlightedIndices(linear, s)).toEqual([0]);
    s = advance(linear, s);
    expect(highlightedIndices(linear, s)).toEqual([1]);
    // 6 תאים — אחרי 5 קידומים נוספים חוזר ל-0
    for (let i = 0; i < 5; i++) s = advance(linear, s);
    expect(highlightedIndices(linear, s)).toEqual([0]);
  });

  it('linear: select מחזיר את אינדקס התא', () => {
    let s = initScan(linear);
    s = advance(linear, s); // index 1
    expect(select(linear, s).selectedIndex).toBe(1);
  });

  it('row-column: סורק שורות → תאים, select דו-שלבי', () => {
    let s = initScan(rc);
    expect(highlightedIndices(rc, s)).toEqual([0, 1, 2]); // שורה 0
    s = advance(rc, s);
    expect(highlightedIndices(rc, s)).toEqual([3, 4, 5]); // שורה 1

    // חזרה לשורה 0 ובחירתה → צלילה לסריקת תאים
    s = advance(rc, s); // wrap → שורה 0
    const drill = select(rc, s);
    expect(drill.selectedIndex).toBeNull();
    s = drill.state;
    expect(highlightedIndices(rc, s)).toEqual([0]); // תא ראשון בשורה

    s = advance(rc, s); // תא 1
    const pick = select(rc, s);
    expect(pick.selectedIndex).toBe(1);
    expect(pick.state.phase).toBe('row'); // אופס חזרה לסריקת שורות
  });
});
