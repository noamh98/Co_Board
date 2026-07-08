import { describe, it, expect } from 'vitest';
import { createDebounceGuard, acceptInput } from './debounce';

describe('scanning debounce guard — C-15', () => {
  it('הקלט הראשון תמיד מתקבל', () => {
    const r = acceptInput(createDebounceGuard(), 1000, 150);
    expect(r.accepted).toBe(true);
    expect(r.guard.lastAcceptedAt).toBe(1000);
  });

  it('קלט שני בתוך החלון נדחה והמונה נשמר', () => {
    let r = acceptInput(createDebounceGuard(), 1000, 150);
    r = acceptInput(r.guard, 1100, 150); // חלפו 100ms < 150ms
    expect(r.accepted).toBe(false);
    expect(r.guard.lastAcceptedAt).toBe(1000);
  });

  it('קלט אחרי החלון מתקבל ומעדכן את המונה', () => {
    let r = acceptInput(createDebounceGuard(), 1000, 150);
    r = acceptInput(r.guard, 1200, 150); // חלפו 200ms >= 150ms
    expect(r.accepted).toBe(true);
    expect(r.guard.lastAcceptedAt).toBe(1200);
  });

  it('גבול מדויק (elapsed === debounceMs) מתקבל', () => {
    let r = acceptInput(createDebounceGuard(), 1000, 150);
    r = acceptInput(r.guard, 1150, 150);
    expect(r.accepted).toBe(true);
    expect(r.guard.lastAcceptedAt).toBe(1150);
  });

  it('debounceMs אפס או שלילי — תמיד מתקבל (no-op)', () => {
    let r = acceptInput(createDebounceGuard(), 1000, 0);
    r = acceptInput(r.guard, 1000, 0);
    expect(r.accepted).toBe(true);
    const neg = acceptInput(r.guard, 1000, -50);
    expect(neg.accepted).toBe(true);
  });

  it('נסיגת שעון (now<last) מתקבלת ומאפסת את המונה', () => {
    let r = acceptInput(createDebounceGuard(), 5000, 150);
    r = acceptInput(r.guard, 100, 150); // השעון נסוג לאחור
    expect(r.accepted).toBe(true);
    expect(r.guard.lastAcceptedAt).toBe(100);
  });

  it('רצף לחיצות רעד — רק הראשונה עוברת, השאר נדחות עד תום החלון', () => {
    let g = createDebounceGuard();
    const times = [1000, 1030, 1060, 1090]; // כולן בתוך 150ms מהראשונה
    const accepted: number[] = [];
    for (const t of times) {
      const r = acceptInput(g, t, 150);
      g = r.guard;
      if (r.accepted) accepted.push(t);
    }
    expect(accepted).toEqual([1000]);
  });
});
