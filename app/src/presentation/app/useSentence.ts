// presentation/app/useSentence.ts — שורת המשפט ובנק הביטויים (R4 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו (כולל דפוס ניקוי הטיימר D3 ו-notifyError מ-Phase 1.7).

import { useEffect, useRef, useState } from 'react';
import type { Cell } from '../../domain/models';
import { createPhrase, type PhraseEntry } from '../../domain/phraseBank';
import { savePhrase, listPhrases, deletePhrase } from '../../data/phraseRepo';
import { notifyError } from '../../services/notify/notifyService';

export function useSentence() {
  const [sentence, setSentence] = useState<Cell[]>([]);
  const [phrases, setPhrases] = useState<PhraseEntry[]>([]);
  const [saveToast, setSaveToast] = useState(false);
  /** טיימר ה-toast "נשמר!" — נשמר לניקוי במצב unmount (D3). */
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // D3: ניקוי טיימר ה-toast ב-unmount.
  useEffect(
    () => () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    },
    [],
  );

  const saveSentence = (profileId: string | undefined): void => {
    if (!profileId || sentence.length === 0) return;
    const entry = createPhrase(profileId, sentence);
    void savePhrase(entry)
      .then(() => {
        setSaveToast(true);
        // D3: שמור את ה-timer לניקוי ב-unmount (מונע setState אחרי הסרה).
        if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
        saveToastTimerRef.current = setTimeout(() => setSaveToast(false), 1500);
      })
      .catch(() => notifyError('שמירת הביטוי נכשלה — נסו שוב'));
  };

  /** טוען את ביטויי הפרופיל (לקראת פתיחת בנק-הביטויים). */
  const fetchPhrases = (profileId: string): Promise<void> =>
    listPhrases(profileId).then((list) => {
      setPhrases(list);
    });

  const deletePhraseById = (id: string): void => {
    void deletePhrase(id).then(() => {
      setPhrases((prev) => prev.filter((p) => p.id !== id));
    });
  };

  return {
    sentence,
    setSentence,
    phrases,
    saveToast,
    saveSentence,
    fetchPhrases,
    deletePhraseById,
  };
}
