import { describe, it, expect } from 'vitest';
import { shouldVibrate, vibrationPattern, type HapticEvent } from './haptics';

describe('haptics — shouldVibrate (טהור)', () => {
  it('מרטט רק כשההגדרה פעילה וגם יש תמיכה', () => {
    expect(shouldVibrate(true, true)).toBe(true);
  });

  it('לא מרטט כשההגדרה כבויה — גם אם יש תמיכה', () => {
    expect(shouldVibrate(false, true)).toBe(false);
  });

  it('לא מרטט כשאין תמיכה — גם אם ההגדרה פעילה', () => {
    expect(shouldVibrate(true, false)).toBe(false);
  });

  it('לא מרטט כששניהם כבויים', () => {
    expect(shouldVibrate(false, false)).toBe(false);
  });
});

describe('haptics — vibrationPattern', () => {
  it('מחזיר תבנית לכל אירוע מוגדר', () => {
    const events: HapticEvent[] = ['wordAdded', 'sentenceSpoken', 'cleared'];
    for (const e of events) {
      const pattern = vibrationPattern(e);
      const valid =
        typeof pattern === 'number'
          ? pattern > 0
          : pattern.length > 0 && pattern.every((n) => n >= 0);
      expect(valid).toBe(true);
    }
  });

  it('wordAdded — רטט יחיד קצר ודיסקרטי', () => {
    const pattern = vibrationPattern('wordAdded');
    expect(typeof pattern).toBe('number');
    expect(pattern).toBeLessThanOrEqual(30);
  });

  it('sentenceSpoken — תבנית מרובת פעימות', () => {
    expect(Array.isArray(vibrationPattern('sentenceSpoken'))).toBe(true);
  });
});
