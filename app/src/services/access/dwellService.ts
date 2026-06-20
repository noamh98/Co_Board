import { useCallback, useEffect, useRef } from 'react';
import type { AccessSettings } from '../../domain/accessSettings';

// שיטות גישה מוטוריות (FR-020, PRD §4.7). React hooks המחזירים handlers לחיבור לתא.
// כל hook נייטרלי כשהתכונה כבויה — מחזיר התנהגות בסיסית (onClick רגיל / handlers ריקים).

const DOUBLE_TAP_WINDOW_MS = 800;

type PointerHandlers = {
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: () => void;
};

/**
 * הפעלה בהשהיה (Dwell): לאחר dwellTimeMs ms של ריחוף מעל האלמנט — onActivate.
 * ביטול אם עוזבים לפני הזמן. dwellTimeMs=0 → handlers ריקים (תכונה כבויה).
 */
export function useDwellActivation(
  onActivate: () => void,
  settings: AccessSettings,
): PointerHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ניקוי timer בעת unmount — מניעת memory leak / קריאה לאחר הסרה.
  useEffect(() => () => clear(), [clear]);

  const enabled = settings.dwellTimeMs > 0;

  const onPointerEnter = useCallback(() => {
    if (!enabled) return;
    clear();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onActivateRef.current();
    }, settings.dwellTimeMs);
  }, [enabled, settings.dwellTimeMs, clear]);

  if (!enabled) {
    return { onPointerEnter: () => {}, onPointerLeave: () => {}, onPointerMove: () => {} };
  }

  return { onPointerEnter, onPointerLeave: clear, onPointerMove: onPointerEnter };
}

/**
 * הפעלה בשחרור (Activate on Release): אם פעיל — מפעיל ב-onPointerUp; אחרת ב-onClick.
 * מונע הפעלה בטעות בעת לחיצה/החלקה — הילד "מכוון" ומשחרר ביעד הנכון.
 */
export function useActivateOnRelease(
  onActivate: () => void,
  settings: AccessSettings,
): { onClick?: () => void; onPointerUp?: () => void } {
  if (settings.activateOnRelease) {
    return { onPointerUp: onActivate };
  }
  return { onClick: onActivate };
}

/**
 * מניעת מגע כפול (Double-Tap Prevention): מסנן לחיצה שנייה בתוך 800ms.
 * כבוי → onClick רגיל.
 */
export function useDoubleTapPrevention(
  onActivate: () => void,
  settings: AccessSettings,
): { onClick: () => void } {
  const lastTapRef = useRef(0);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const enabled = settings.doubleTapPrevention;

  const onClick = useCallback(() => {
    if (!enabled) {
      onActivateRef.current();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) return; // לחיצה כפולה — מסונן
    lastTapRef.current = now;
    onActivateRef.current();
  }, [enabled]);

  return { onClick };
}
