// presentation/ui/useLongPress.ts — מחווה אחת לשחרור מצב-עריכה (MVP: בלי PIN).
// לחיצה-ארוכה (~1.2ש') בעכבר/מגע/מקלדת פותחת את מצב המבוגר. הזמן מכוון בכוונה כדי
// שילד לא "ישחרר" בטעות — משלים את הקשחת mode==='locked' ב-App (history/beforeunload).
//
// נגישות (WCAG): המחווה אינה תלויה במגע בלבד. כפתור-המנעול ממוקד-מקלדת, ו-Enter/Space
// בהחזקה מפעילים את אותה לחיצה-ארוכה (focus → הקשה ארוכה). e.repeat מתעלם מ-auto-repeat.
// אדיטיבי וטהור: ה-hook אינו יודע מה ה-action — רק מתי "ארוך מספיק" קרה.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export interface UseLongPressOptions {
  /** משך ההחזקה הנדרש (מ"ש) לפני ה-fire. ברירת מחדל 1200. */
  durationMs?: number;
  /** נקרא כשההחזקה מתחילה — ל-feedback ויזואלי (מילוי טבעת וכו'). */
  onStart?: () => void;
  /** נקרא כשההחזקה בוטלה לפני הסף (שחרור/יציאה). */
  onCancel?: () => void;
}

/** Props לפיזור ישיר על כפתור (<button {...handlers} />). */
export interface LongPressHandlers {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (e: ReactKeyboardEvent) => void;
  onKeyUp: () => void;
}

export interface UseLongPressResult {
  handlers: LongPressHandlers;
  /** האם המשתמש מחזיק כעת (לאינדיקציה ויזואלית של "כמעט שם"). */
  pressing: boolean;
}

export const DEFAULT_LONG_PRESS_MS = 1200;

/**
 * מחזיר handlers + מצב-החזקה ללחיצה-ארוכה נגישה.
 * הטיימר נשמר ב-ref ומנוקה ב-unmount; ה-callbacks נשמרים ב-ref כדי שה-handlers
 * יישארו יציבים בין render-ים (לא לרשום-מחדש מאזינים על הכפתור).
 */
export function useLongPress(
  onLongPress: () => void,
  options: UseLongPressOptions = {},
): UseLongPressResult {
  const { durationMs = DEFAULT_LONG_PRESS_MS, onStart, onCancel } = options;
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((): void => {
    if (timerRef.current !== null) return; // כבר מחזיק — התעלם מ-down כפול.
    firedRef.current = false;
    setPressing(true);
    onStartRef.current?.();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      setPressing(false);
      onLongPressRef.current();
    }, durationMs);
  }, [durationMs]);

  const cancel = useCallback((): void => {
    const wasActive = timerRef.current !== null;
    clearTimer();
    setPressing(false);
    // onCancel רק אם בוטל לפני ה-fire (שחרור מוקדם), לא אחרי הצלחה.
    if (wasActive && !firedRef.current) onCancelRef.current?.();
  }, [clearTimer]);

  // ניקוי טיימר ב-unmount — מונע fire/setState אחרי הסרת הרכיב.
  useEffect(() => clearTimer, [clearTimer]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent): void => {
      // לחצן ראשי / מגע בלבד — מתעלם מלחצן ימני/אמצעי.
      if (e.button !== 0) return;
      start();
    },
    [start],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent): void => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      if (e.repeat) return; // auto-repeat → התחלה אחת בלבד.
      e.preventDefault();
      start();
    },
    [start],
  );

  const handlers: LongPressHandlers = {
    onPointerDown,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onKeyDown,
    onKeyUp: cancel,
  };

  return { handlers, pressing };
}
