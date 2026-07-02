// services/ai/aiProvider.ts — ספק LLM ליצירת לוח (Phase 0, H-KEY).
// השתנה: במקום fetch ישיר ל-VITE_AI_ENDPOINT מהלקוח, קורא ל-Cloud Function `aiBoard`
// (onCall) שמחזיק את ה-endpoint/מפתח בשרת. ה-interface (topic,count)→GeneratedWord[] נשמר —
// boardGenerator וה-callers לא משתנים. timeout/auth/rate-limit נאכפים בשרת.

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PartOfSpeech } from '../../domain/models';
import type { GeneratedWord } from './boardGenerator';
import { FUNCTIONS_REGION } from '../functionsRegion';

const VALID_POS = new Set<string>([
  'noun', 'verb', 'adjective', 'pronoun', 'preposition', 'adverb', 'number', 'other',
]);

function toPos(s: string | undefined): PartOfSpeech | undefined {
  return s && VALID_POS.has(s) ? (s as PartOfSpeech) : undefined;
}

interface AiBoardRequest {
  action: 'generate';
  topic: string;
  count: number;
}
interface AiBoardResponse {
  words: Array<{ word: string; pos?: string }>;
}

export function createLlmProvider(): (topic: string, count: number) => Promise<GeneratedWord[]> {
  return async (topic: string, count: number): Promise<GeneratedWord[]> => {
    const fns = getFunctions(getApp(), FUNCTIONS_REGION);
    const call = httpsCallable<AiBoardRequest, AiBoardResponse>(fns, 'aiBoard');

    let data: AiBoardResponse;
    try {
      ({ data } = await call({ action: 'generate', topic, count }));
    } catch (err) {
      // נפילה חיננית למעלה (boardGenerator זורק → ה-UI מציג שגיאה ידידותית).
      throw new Error(err instanceof Error ? err.message : 'AI request failed');
    }

    return (data.words ?? []).map((w) => ({
      word: w.word,
      ...(toPos(w.pos) ? { pos: toPos(w.pos) } : {}),
    }));
  };
}
