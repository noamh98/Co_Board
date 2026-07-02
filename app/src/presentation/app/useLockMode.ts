// presentation/app/useLockMode.ts — נעילה/שחרור + Guided Access (R1 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו.

import { useEffect, useState } from 'react';
import type { AppMode } from '../../domain/access';

/** מצב התצוגה במצב מבוגר: ספריית-לוחות (בית) מול לוח בודד. */
export type AppView = 'library' | 'board';

/**
 * @param onLocked מופעל בעת נעילה — App מאפס builder + ניווט ללוח הבית של הפרופיל
 *                 (הילד לא נשאר בלוח שהמבוגר פתח).
 */
export function useLockMode(onLocked: () => void) {
  const [mode, setMode] = useState<AppMode>('locked');
  // MVP: "בית" של המבוגר הוא ספריית-לוחות; הילד (נעול) תמיד בתוך לוח.
  const [view, setView] = useState<AppView>('board');

  // מצב נעול מלא (Guided Access, FR-019) — נשמר גם כשהשחרור עבר ללחיצה-ארוכה:
  // הלחיצה-הארוכה היא המחווה המכוונת של המבוגר; הילד לא "בורח" בטעות (popstate/beforeunload).
  useEffect(() => {
    if (mode !== 'locked') return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => window.history.pushState(null, '', window.location.href);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [mode]);

  // unlock: מעבר ישיר למצב מבוגר ונחיתה בספריית-הלוחות (הבית של המבוגר).
  const unlock = (): void => {
    setMode('adult');
    setView('library');
  };

  // lock: חזרה למצב ילד — האיפוס עצמו (builder/ניווט) אצל הקורא דרך onLocked.
  const lock = (): void => {
    setMode('locked');
    setView('board');
    onLocked();
  };

  return { mode, view, setView, unlock, lock };
}
