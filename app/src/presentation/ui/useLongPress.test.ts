import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress, DEFAULT_LONG_PRESS_MS } from './useLongPress';

// שלב 1 — לחיצה-ארוכה: fire רק אחרי הסף, ביטול בשחרור מוקדם, נגישות-מקלדת.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function press(handlers: ReturnType<typeof useLongPress>['handlers']): void {
  handlers.onPointerDown({ button: 0 } as never);
}

describe('useLongPress', () => {
  it('יורה onLongPress רק אחרי שעבר הסף', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { durationMs: 1000 }));

    act(() => press(result.current.handlers));
    act(() => void vi.advanceTimersByTime(999));
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('שחרור לפני הסף מבטל ולא יורה', () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress(onLongPress, { durationMs: 1000, onCancel }),
    );

    act(() => press(result.current.handlers));
    act(() => void vi.advanceTimersByTime(500));
    act(() => result.current.handlers.onPointerUp());
    act(() => void vi.advanceTimersByTime(1000));

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('יציאת המצביע (leave) מבטלת', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { durationMs: 1000 }));

    act(() => press(result.current.handlers));
    act(() => result.current.handlers.onPointerLeave());
    act(() => void vi.advanceTimersByTime(2000));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('מצב pressing מתחלף: true בהחזקה, false אחרי fire', () => {
    const { result } = renderHook(() => useLongPress(vi.fn(), { durationMs: 1000 }));

    expect(result.current.pressing).toBe(false);
    act(() => press(result.current.handlers));
    expect(result.current.pressing).toBe(true);
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.pressing).toBe(false);
  });

  it('נגישות-מקלדת: Enter בהחזקה פותח, e.repeat לא מתחיל מחדש', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { durationMs: 1000 }));
    const preventDefault = vi.fn();

    act(() =>
      result.current.handlers.onKeyDown({
        key: 'Enter',
        repeat: false,
        preventDefault,
      } as never),
    );
    // auto-repeat לא אמור להתחיל טיימר חדש
    act(() =>
      result.current.handlers.onKeyDown({ key: 'Enter', repeat: true, preventDefault } as never),
    );
    act(() => void vi.advanceTimersByTime(1000));

    expect(preventDefault).toHaveBeenCalled();
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('מתעלם מלחצן עכבר שאינו ראשי', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { durationMs: 1000 }));

    act(() => result.current.handlers.onPointerDown({ button: 2 } as never));
    act(() => void vi.advanceTimersByTime(2000));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('ברירת המחדל היא 1200 מ"ש', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => press(result.current.handlers));
    act(() => void vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS - 1));
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
