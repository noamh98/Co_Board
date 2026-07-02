// functions/test/aiBoard.test.ts — בדיקות יחידה ל-repairTruncatedWordsJson (3.2).
// פונקציה טהורה — אין תלות באמולטור, אך רץ כאן יחד עם rules.test.ts/rateLimit.test.ts
// (npm run test:rules) כדי לא להוסיף job/סקריפט CI נפרד.

import { describe, it, expect } from 'vitest';
import { repairTruncatedWordsJson } from '../src/aiBoard';

describe('repairTruncatedWordsJson (aiBoard.ts — שחזור JSON נקטע מ-Gemini)', () => {
  it('משחזר מערך תקין שנקטע אחרי אובייקט שלם', () => {
    const truncated = '{"words":[{"word":"כלב","pos":"noun"},{"word":"חתול","pos":"noun"';
    expect(repairTruncatedWordsJson(truncated)).toEqual({
      words: [{ word: 'כלב', pos: 'noun' }],
    });
  });

  it('משחזר כמה פריטים שלמים לפני הקטיעה', () => {
    const truncated =
      '{"words":[{"word":"כלב","pos":"noun"},{"word":"חתול","pos":"noun"},{"word":"רץ"';
    expect(repairTruncatedWordsJson(truncated)).toEqual({
      words: [
        { word: 'כלב', pos: 'noun' },
        { word: 'חתול', pos: 'noun' },
      ],
    });
  });

  it('מחזיר null כשאין אפילו פריט שלם אחד', () => {
    expect(repairTruncatedWordsJson('{"words":[{"word":"כ')).toBeNull();
  });

  it('מחזיר null כשאין "[" בטקסט כלל', () => {
    expect(repairTruncatedWordsJson('not json at all')).toBeNull();
  });

  it('מחזיר null כשה-"}" האחרון מופיע לפני ה-"["', () => {
    expect(repairTruncatedWordsJson('} garbage [')).toBeNull();
  });

  it('מחזיר null על תוכן שאינו JSON תקין גם אחרי החיתוך', () => {
    expect(repairTruncatedWordsJson('[{"word": broken}')).toBeNull();
  });

  it('JSON תקין ולא-נקטע (מקרה שלא אמור להגיע לכאן בפועל, אבל עדיין נכון)', () => {
    const full = '[{"word":"שלום","pos":"noun"}]';
    expect(repairTruncatedWordsJson(full)).toEqual({
      words: [{ word: 'שלום', pos: 'noun' }],
    });
  });
});
