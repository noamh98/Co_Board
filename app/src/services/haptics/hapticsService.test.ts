import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerHaptic, isHapticsSupported } from './hapticsService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hapticsService — feature detection + gating', () => {
  it('מרטט כשההגדרה פעילה וגם navigator.vibrate נתמך', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    triggerHaptic(true, 'wordAdded');
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('לא מרטט כשההגדרה כבויה (opt-in)', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    triggerHaptic(false, 'wordAdded');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('isHapticsSupported=false כשאין vibrate, ו-triggerHaptic אינו זורק', () => {
    vi.stubGlobal('navigator', {});
    expect(isHapticsSupported()).toBe(false);
    expect(() => triggerHaptic(true, 'cleared')).not.toThrow();
  });

  it('בולע חריגות מ-navigator.vibrate (לא חוסם UX)', () => {
    const vibrate = vi.fn(() => {
      throw new Error('blocked by browser');
    });
    vi.stubGlobal('navigator', { vibrate });
    expect(() => triggerHaptic(true, 'sentenceSpoken')).not.toThrow();
  });
});
