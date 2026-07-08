// presentation/app/useCellDispatcher.ts — ה-dispatcher של לחיצות תאים (R5 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו. E1: onCell יציב (useCallback) — לחיצה לא מרנדרת מחדש את כל
// הלוח (memo). הגדרות הקול נקראות דרך speakOpts (ref) ולכן אינן בין התלויות.

import { useCallback } from 'react';
import type { Cell } from '../../domain/models';
import type { AppMode } from '../../domain/access';
import type { ActiveContext } from '../../data/bootstrap';
import type { Board } from '../../domain/models';
import {
  type NavStack,
  navPush,
  navPop,
  navHome,
} from '../../domain/navigationStack';
import {
  type ModelingSession,
  createModelingSession,
  toggleHighlight,
} from '../../domain/modelingSession';
import { appendWord } from '../../domain/sentence';
import { speakCell, type SpeakOptions, type TtsLike } from '../../services/tts/ttsService';
import { triggerHaptic } from '../../services/haptics/hapticsService';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { SymbolRepo } from '../../data/symbolRepo';
import {
  pluralizeNoun,
  addDefiniteArticle,
  conjugatePresent,
} from '../../domain/morphology/hebrewMorphology';

interface CellDispatcherParams {
  modelingActive: boolean;
  mode: AppMode;
  ctx: ActiveContext | null;
  currentBoard: Board | null;
  setModelingSession: React.Dispatch<React.SetStateAction<ModelingSession | null>>;
  setSentence: React.Dispatch<React.SetStateAction<Cell[]>>;
  setNavStack: React.Dispatch<React.SetStateAction<NavStack | null>>;
  speakOpts: () => SpeakOptions;
  ttsRef: React.RefObject<TtsLike | null>;
  symbolRepoRef: React.MutableRefObject<SymbolRepo>;
  sessionIdRef: React.MutableRefObject<string>;
  preventDupRef: React.RefObject<boolean>;
  predictionsRef: React.RefObject<string[]>;
  addPredictedWord: (word: string) => void;
  /** 2.7 (C-09) — ערך עדכני של hapticFeedback (ref, בלי stale closure ב-onCell). */
  hapticEnabledRef: React.RefObject<boolean>;
}

export function useCellDispatcher({
  modelingActive,
  mode,
  ctx,
  currentBoard,
  setModelingSession,
  setSentence,
  setNavStack,
  speakOpts,
  ttsRef,
  symbolRepoRef,
  sessionIdRef,
  preventDupRef,
  predictionsRef,
  addPredictedWord,
  hapticEnabledRef,
}: CellDispatcherParams) {
  return useCallback(
    (cell: Cell): void => {
      if (modelingActive && mode === 'adult') {
        setModelingSession((prev) =>
          prev
            ? toggleHighlight(prev, cell.id)
            : toggleHighlight(createModelingSession(), cell.id),
        );
        return;
      }

      const action = cell.action;

      if (action.type === 'speak') {
        setSentence((s) => appendWord(s, cell, preventDupRef.current ?? false));
        void speakCell(cell, symbolRepoRef.current, ttsRef.current, speakOpts());
        // 2.7 (C-09) — משוב רטט על הוספת מילה. fire-and-forget, אחרי ההשמעה,
        // כדי לא לעכב את "הלחיצה הראשונה מדברת".
        triggerHaptic(hapticEnabledRef.current ?? false, 'wordAdded');
        if (ctx && currentBoard) {
          analyticsService.trackCellPress(
            ctx.activeProfile.id,
            currentBoard.id,
            cell,
            sessionIdRef.current ?? '',
          );
        }
        // E2: ה-prefetch של הניקוד הוסר — BoardView מחשב ניקוד מרוכז ברמת הלוח.
      } else if (action.type === 'navigate') {
        setNavStack((prev) => (prev ? navPush(prev, action.targetBoardId) : prev));
      } else if (action.type === 'back') {
        setNavStack((prev) => (prev ? navPop(prev) : prev));
      } else if (action.type === 'home') {
        if (ctx) {
          setNavStack(navHome(ctx.activeProfile.homeBoardId));
        }
      } else if (action.type === 'deleteWord') {
        setSentence((s) => s.slice(0, -1));
      } else if (action.type === 'clear') {
        setSentence([]);
      } else if (action.type === 'modifyWord') {
        // I1/I5 — תא הטיה: מטה את המילה האחרונה במשפט.
        const op = action.op;
        setSentence((s) => {
          if (s.length === 0) return s;
          const last = s[s.length - 1];
          let label = last.label;
          if (op === 'pluralize') label = pluralizeNoun(label, last.morphology?.gender ?? 'm');
          else if (op === 'definite') label = addDefiniteArticle(label);
          else if (op === 'feminine') {
            const n = last.morphology?.number;
            label = conjugatePresent(label, { gender: 'f', number: n === 'dual' ? 'plural' : n });
          } else if (op === 'masculine') {
            const n = last.morphology?.number;
            label = conjugatePresent(label, { gender: 'm', number: n === 'dual' ? 'plural' : n });
          }
          const updated: Cell = { ...last, label, nikud: undefined, vocalization: undefined };
          return [...s.slice(0, -1), updated];
        });
      } else if (action.type === 'insertPrediction') {
        // I2/I5 — מוסיף את ההצעה הראשונה הזמינה.
        const first = predictionsRef.current?.[0];
        if (first) addPredictedWord(first);
      } else if (action.type === 'playAudio') {
        void speakCell(cell, symbolRepoRef.current, ttsRef.current, speakOpts());
      } else if (action.type === 'playVideo' || action.type === 'openLink') {
        // I5 — פתיחת מדיה/קישור חיצוני.
        try {
          window.open(action.url, '_blank', 'noopener');
        } catch {
          /* no-op */
        }
      }
      // setVolume — שמור לעתיד (אין בקרת ווליום גלובלית כרגע).
    },
    [
      modelingActive,
      mode,
      ctx,
      currentBoard,
      setModelingSession,
      setSentence,
      setNavStack,
      speakOpts,
      ttsRef,
      symbolRepoRef,
      sessionIdRef,
      preventDupRef,
      predictionsRef,
      addPredictedWord,
      hapticEnabledRef,
    ],
  );
}
