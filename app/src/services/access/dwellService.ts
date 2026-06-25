import { useCallback, useEffect, useRef } from 'react';
import type { AccessSettings } from '../../domain/accessSettings';

// שיטות גישה מוטוריות (FR-020, PRD §4.7). React hooks המחזירים handlers לחיבור לתא.
// כל hook נייטרלי כשהתכונה כבויה — מחזיר התנהגות בסיסית (onClick רגיל / handlers ריקים).

const DOUBLE_TAP_WINDOW_MS = 800;
/** מעבר לסף זה (px) = יציאה מכוונת מהתא → ביטול. מתחת — רעד/ריחוף שאסור לאפס (A2). */
const DWELL_MOVE_CANCEL_PX = 30;

/** רק clientX/clientY דרושים — תואם ל-React.PointerEvent וגם לקריאה ללא ארגומנט. */
type PointerLike = { clientX: number; clientY: number };

type PointerHandlers = {
  onPointerEnter: (e?: PointerLike) => void;
  onPointerLeave: () => void;
  onPointerMove: (e?: PointerLike) => void;
};

/**
 * הפעלה בהשהיה (Dwell): לאחר dwellTimeMs ms של ריחוף מעל האלמנט — onActivate.
 * תיקון A2: תזוזה קטנה (רעד/יד לא יציבה) אינה מאפסת את הטיימר — אחרת הפעלה
 * לעולם לא מתרחשת. ביטול רק ביציאה (pointerleave) או תזוזה החורגת מסף פיקסלים.
 * dwellTimeMs=0 → handlers ריקים (תכונה כבויה).
 */
export function useDwellActivation(
  onActivate: () => void,
  settings: AccessSettings,
): PointerHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    anchorRef.current = null;
  }, []);

  // ניקוי timer בעת unmount — מניעת memory leak / קריאה לאחר הסרה.
  useEffect(() => () => clear(), [clear]);

  const enabled = settings.dwellTimeMs > 0;

  // מתחיל טיימר רק אם אינו רץ כבר — תזוזה לא מאפסת ספירה פעילה.
  const start = useCallback(
    (e?: PointerLike) => {
      if (!enabled) return;
      if (timerRef.current !== null) return;
      anchorRef.current = e ? { x: e.clientX, y: e.clientY } : null;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        anchorRef.current = null;
        onActivateRef.current();
      }, settings.dwellTimeMs);
    },
    [enabled, settings.dwellTimeMs],
  );

  const onPointerMove = useCallback(
    (e?: PointerLike) => {
      if (!enabled) return;
      if (timerRef.current === null) {
        start(e);
        return;
      }
      if (e && anchorRef.current) {
        const dx = e.clientX - anchorRef.current.x;
        const dy = e.clientY - anchorRef.current.y;
        if (Math.hypot(dx, dy) > DWELL_MOVE_CANCEL_PX) {
          clear(); // יציאה מכוונת — מבטל את ההפעלה
        }
      }
      // תזוזה קטנה (רעד) — לא מאפסת ולא מבטלת את הטיימר.
    },
    [enabled, start, clear],
  );

  if (!enabled) {
    return { onPointerEnter: () => {}, onPointerLeave: () => {}, onPointerMove: () => {} };
  }

  return { onPointerEnter: start, onPointerLeave: clear, onPointerMove };
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
