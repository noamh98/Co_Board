import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useDwellActivation,
  useActivateOnRelease,
  useDoubleTapPrevention,
} from './dwellService';
import { DEFAULT_ACCESS_SETTINGS } from '../../domain/accessSettings';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDwellActivation', () => {
  it('מפעיל לאחר dwellTimeMs', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDwellActivation(onActivate, { ...DEFAULT_ACCESS_SETTINGS, dwellTimeMs: 1000 }),
    );
    act(() => result.current.onPointerEnter());
    expect(onActivate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(999));
    expect(onActivate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('רעד (תזוזות קטנות) אינו מאפס את הטיימר — ההפעלה עדיין מתרחשת', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDwellActivation(onActivate, { ...DEFAULT_ACCESS_SETTINGS, dwellTimeMs: 1000 }),
    );
    act(() => result.current.onPointerEnter({ clientX: 100, clientY: 100 }));
    // רעד מתמשך — תזוזות קטנות כל 100ms (היה מאפס בכל פעם → לעולם לא מפעיל)
    for (let t = 0; t < 1000; t += 100) {
      act(() => vi.advanceTimersByTime(100));
      act(() =>
        result.current.onPointerMove({ clientX: 100 + (t % 6), clientY: 100 - (t % 5) }),
      );
    }
    act(() => vi.advanceTimersByTime(50));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('תזוזה גדולה (יציאה מכוונת) מבטלת את ההפעלה', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDwellActivation(onActivate, { ...DEFAULT_ACCESS_SETTINGS, dwellTimeMs: 1000 }),
    );
    act(() => result.current.onPointerEnter({ clientX: 100, clientY: 100 }));
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.onPointerMove({ clientX: 200, clientY: 200 }));
    act(() => vi.advanceTimersByTime(1000));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('מבטל אם עוזבים לפני הזמן', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDwellActivation(onActivate, { ...DEFAULT_ACCESS_SETTINGS, dwellTimeMs: 1000 }),
    );
    act(() => result.current.onPointerEnter());
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.onPointerLeave());
    act(() => vi.advanceTimersByTime(1000));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('dwellTimeMs=0 → handlers ריקים (לא מפעיל)', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDwellActivation(onActivate, { ...DEFAULT_ACCESS_SETTINGS, dwellTimeMs: 0 }),
    );
    act(() => result.current.onPointerEnter());
    act(() => vi.advanceTimersByTime(5000));
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('useActivateOnRelease', () => {
  it('פעיל → onPointerUp מפעיל, אין onClick', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useActivateOnRelease(onActivate, { ...DEFAULT_ACCESS_SETTINGS, activateOnRelease: true }),
    );
    expect(result.current.onClick).toBeUndefined();
    result.current.onPointerUp?.();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('כבוי → onClick מפעיל', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useActivateOnRelease(onActivate, DEFAULT_ACCESS_SETTINGS),
    );
    expect(result.current.onPointerUp).toBeUndefined();
    result.current.onClick?.();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

describe('useDoubleTapPrevention', () => {
  it('חוסם לחיצה שנייה בתוך 800ms', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDoubleTapPrevention(onActivate, { ...DEFAULT_ACCESS_SETTINGS, doubleTapPrevention: true }),
    );
    act(() => result.current.onClick());
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.onClick()); // בתוך החלון — נחסם
    expect(onActivate).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(800));
    act(() => result.current.onClick()); // אחרי החלון — עובר
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it('כבוי → כל לחיצה עוברת', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useDoubleTapPrevention(onActivate, DEFAULT_ACCESS_SETTINGS),
    );
    act(() => result.current.onClick());
    act(() => result.current.onClick());
    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});
