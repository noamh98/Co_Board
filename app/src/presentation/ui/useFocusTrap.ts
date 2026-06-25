// presentation/ui/useFocusTrap.ts — נגישות מודאלים (D1, WCAG 2.1/2.2).
// מספק: מלכודת פוקוס (Tab/Shift+Tab מסתובב בתוך הדיאלוג), Escape→סגירה,
// פוקוס לאלמנט הראשון בפתיחה, והחזרת הפוקוס לאלמנט שהיה ממוקד לפני הפתיחה.
// משתמשי מקלדת/מתג אינם "נתקעים" עוד מחוץ למודאל.

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * מחזיר ref לחיבור למיכל הדיאלוג. הוסף role="dialog" aria-modal="true" tabIndex={-1}
 * על אותו אלמנט. onClose נקרא ב-Escape.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
): RefObject<T> {
  const containerRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // שומר את ה-onClose העדכני ללא הרצה-מחדש של ה-effect (יציבות מאזין).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusables && focusables.length > 0 ? focusables[0] : container)?.focus?.();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
  }, []);

  return containerRef;
}
