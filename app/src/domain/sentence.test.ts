import { describe, it, expect } from 'vitest';
import { appendWord } from './sentence';
import type { Cell } from './models';

const cell = (id: string, label: string): Cell => ({
  id,
  label,
  action: { type: 'speak' },
});

describe('appendWord — מניעת כפילויות ברצף (F7)', () => {
  it('ברירת מחדל (כבוי): מוסיף תמיד, גם מילה זהה ברצף', () => {
    let s: Cell[] = [];
    s = appendWord(s, cell('a', 'עוד'));
    s = appendWord(s, cell('a', 'עוד'));
    expect(s.map((c) => c.label)).toEqual(['עוד', 'עוד']);
  });

  it('כשמופעל: לחיצה חוזרת על אותה מילה לא מוסיפה כפילות', () => {
    let s: Cell[] = [];
    s = appendWord(s, cell('a', 'אני'), true);
    s = appendWord(s, cell('a', 'אני'), true); // כפילות — מסונן.
    s = appendWord(s, cell('b', 'רוצה'), true);
    s = appendWord(s, cell('b', 'רוצה'), true); // כפילות — מסונן.
    expect(s.map((c) => c.label)).toEqual(['אני', 'רוצה']);
  });

  it('כשמופעל: מילים שונות עוקבות מתווספות כרגיל', () => {
    let s: Cell[] = [];
    s = appendWord(s, cell('a', 'אני'), true);
    s = appendWord(s, cell('b', 'רוצה'), true);
    s = appendWord(s, cell('a', 'אני'), true); // לא צמוד לקודמתה → מתווסף.
    expect(s.map((c) => c.label)).toEqual(['אני', 'רוצה', 'אני']);
  });

  it('משווה לפי vocalization/nikud אם קיים (כמו ההקראה)', () => {
    const a1: Cell = { id: 'x', label: 'שלום', vocalization: 'שָׁלוֹם', action: { type: 'speak' } };
    const a2: Cell = { id: 'y', label: 'אחר', vocalization: 'שָׁלוֹם', action: { type: 'speak' } };
    const out = appendWord([a1], a2, true);
    expect(out).toHaveLength(1); // אותה הגייה → כפילות.
  });
});
