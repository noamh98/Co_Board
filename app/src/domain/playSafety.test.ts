import { describe, it, expect } from 'vitest';
import { shouldConfirmClear } from './playSafety';

describe('playSafety — shouldConfirmClear (טהור)', () => {
  it('ברירת-מחדל (undefined) = מבקש אישור כשיש מילים', () => {
    expect(shouldConfirmClear(undefined, true)).toBe(true);
  });

  it('ברירת-מחדל (undefined) אך אין מילים = אין צורך באישור', () => {
    expect(shouldConfirmClear(undefined, false)).toBe(false);
  });

  it('פעיל מפורש + יש מילים = מבקש אישור', () => {
    expect(shouldConfirmClear(true, true)).toBe(true);
  });

  it('כבוי מפורש = ניקוי מיידי גם כשיש מילים', () => {
    expect(shouldConfirmClear(false, true)).toBe(false);
  });

  it('כבוי מפורש + אין מילים = ניקוי מיידי', () => {
    expect(shouldConfirmClear(false, false)).toBe(false);
  });
});
