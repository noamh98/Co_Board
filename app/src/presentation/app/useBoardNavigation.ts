// presentation/app/useBoardNavigation.ts — ניווט לוחות ונגזרותיו (R4 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו, כולל ההערה על ה-race של איפוס-פרופיל (הפיל את App.test ב-CI).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cell } from '../../domain/models';
import type { ActiveContext } from '../../data/bootstrap';
import {
  type NavStack,
  createNavStack,
  navCurrent,
} from '../../domain/navigationStack';
import { maxLevel, isFrozenCore } from '../../domain/growingVocab';

/**
 * @param onProfileSwitched מופעל בהחלפת פרופיל אמיתית (לא בטעינה ראשונית) —
 *                          App מנקה את שורת-המשפט.
 */
export function useBoardNavigation(
  ctx: ActiveContext | null,
  onProfileSwitched: () => void,
) {
  const [navStack, setNavStack] = useState<NavStack | null>(null);
  // I4
  const [currentLevel, setCurrentLevel] = useState(0);
  // הפרופיל שאיפסנו עבורו לאחרונה — מבדיל טעינה ראשונית מהחלפת פרופיל אמיתית.
  const resetProfileIdRef = useRef<string | null>(null);

  // איפוס מחסנית ניווט כשמחליפים פרופיל.
  // טעינה ראשונית כבר מאתחלת navStack ב-bootstrap; כאן מאפסים רק בהחלפת פרופיל
  // אמיתית. בלי הבחנה זו, אפקט ה-passive מנקה את sentence אחרי הרינדור הראשון —
  // ויכול למחוק לחיצה ראשונה שקרתה לפניו (race שהפיל את App.test.tsx ב-CI).
  useEffect(() => {
    if (!ctx) return;
    const id = ctx.activeProfile.id;
    if (resetProfileIdRef.current === id) return;
    const firstLoad = resetProfileIdRef.current === null;
    resetProfileIdRef.current = id;
    if (firstLoad) return;
    setNavStack(createNavStack(ctx.activeProfile.homeBoardId));
    onProfileSwitched();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.activeProfile.id]);

  const currentBoard = useMemo(() => {
    if (!ctx) return null;
    if (!navStack) return ctx.board;
    return ctx.allBoards[navCurrent(navStack)] ?? ctx.board;
  }, [navStack, ctx]);

  // I4: רשימת התאים הגלויים בלוח הנוכחי (סדר רינדור זהה ל-BoardView) — לסריקה I3 וניבוי I2.
  const visibleCells = useMemo(() => {
    if (!currentBoard) return [] as Cell[];
    const out: Cell[] = [];
    for (const p of currentBoard.placements) {
      const c = currentBoard.cells[p.cellId];
      if (!c || c.hidden) continue;
      if (!isFrozenCore(c) && (c.level ?? 0) > currentLevel) continue;
      out.push(c);
    }
    return out;
  }, [currentBoard, currentLevel]);

  const boardMaxLevel = useMemo(
    () => (currentBoard ? maxLevel(currentBoard) : 0),
    [currentBoard],
  );

  // I4 — איפוס רמת החשיפה במעבר בין לוחות.
  useEffect(() => {
    setCurrentLevel(0);
  }, [currentBoard?.id]);

  return {
    navStack,
    setNavStack,
    currentBoard,
    visibleCells,
    boardMaxLevel,
    currentLevel,
    setCurrentLevel,
  };
}
