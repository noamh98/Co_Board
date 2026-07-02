// presentation/app/usePrediction.ts — ניבוי מילה הבאה I2 (R3 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו: מודל n-gram מקומי + הצעות + הוספת מילת ניבוי למשפט.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cell } from '../../domain/models';
import { predictNext, type NgramModel, emptyModel } from '../../domain/prediction/predictor';
import { getPredictionModel, recordSequence } from '../../data/predictionRepo';
import { appendWord } from '../../domain/sentence';

interface PredictionParams {
  enabled: boolean;
  sentence: Cell[];
  setSentence: React.Dispatch<React.SetStateAction<Cell[]>>;
  visibleCells: Cell[];
  /** הקראת מילה בהגדרות הקול הנוכחיות (stable callback מ-useTtsSettings). */
  speak: (text: string) => void;
  /** F7: ערך עדכני של מניעת-כפילויות (ref — בלי stale closure). */
  preventDupRef: React.RefObject<boolean>;
}

export function usePrediction({
  enabled,
  sentence,
  setSentence,
  visibleCells,
  speak,
  preventDupRef,
}: PredictionParams) {
  // I2
  const [predictions, setPredictions] = useState<string[]>([]);
  const predictionModelRef = useRef<NgramModel>(emptyModel());
  const predictionsRef = useRef<string[]>([]);
  predictionsRef.current = predictions;

  // I2 — טעינת מודל הניבוי המקומי פעם אחת.
  useEffect(() => {
    void getPredictionModel()
      .then((m) => {
        predictionModelRef.current = m;
      })
      .catch(() => {});
  }, []);

  // I2 — חישוב הצעות כשהמשפט/הלוח משתנים (רק כשהניבוי מופעל).
  useEffect(() => {
    if (!enabled) {
      setPredictions([]);
      return;
    }
    const candidates = visibleCells.map((c) => c.label);
    const context = sentence.map((c) => c.label);
    const preds = predictNext(predictionModelRef.current, context, { candidates, topN: 5 }).map(
      (p) => p.word,
    );
    // Fallback: model empty for new users → show first N visible board cells as suggestions.
    setPredictions(preds.length > 0 ? preds : candidates.slice(0, 5));
  }, [sentence, visibleCells, enabled]);

  // I2: מוסיף מילת ניבוי למשפט ומקריא אותה.
  const addPredictedWord = useCallback(
    (word: string): void => {
      const cell: Cell = { id: `pred-${word}`, label: word, action: { type: 'speak' } };
      setSentence((s) => appendWord(s, cell, preventDupRef.current ?? false));
      speak(word);
    },
    [setSentence, speak, preventDupRef],
  );

  // I2 — למידה מקומית מהאמירה שנאמרה (n-gram פרטי).
  const learnFromSentence = useCallback((labels: string[]): void => {
    void recordSequence(labels)
      .then(() => getPredictionModel())
      .then((m) => {
        predictionModelRef.current = m;
      })
      .catch(() => {});
  }, []);

  return { predictions, predictionsRef, addPredictedWord, learnFromSentence };
}
