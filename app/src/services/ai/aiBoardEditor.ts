// services/ai/aiBoardEditor.ts — עריכת-AI שיחתית של לוח קיים (F4, Phase 4). ⚠️ SCAFFOLD.
// "תוסיף קטגוריית אוכל / החלף צבעים / סדר מחדש" → patch-diff על הלוח תוך שמירת מבנה.
//
// ⚠️ STUB מכוון: חוזה ה-patch ופרומפט העריכה של ה-AI *אטומים* (לא נחשפו בקוד שנמסר).
//    אסור להמציא אותם. הצד-שרת (functions/src/aiBoard.ts, action='edit') מחזיר כרגע
//    HttpsError('unimplemented'). כשייקבע חוזה ה-patch — להשלים כאן ובשרת יחד.
// TODO(F4): להגדיר טיפוס BoardPatch (add/remove/recolor/reorder), לאמת אותו מול הלוח,
//    ולהחיל diff (לא רינדור-מחדש) — Ponytail: patch ממוקד, שמירת cellId יציבים.

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Board } from '../../domain/models';
import { FUNCTIONS_REGION } from '../functionsRegion';

export interface EditBoardResult {
  /** הלוח לאחר ההחלה (כרגע לא ממומש — ראה STUB). */
  board: Board;
  /** סיכום קצר של השינוי להצגה למשתמש. */
  summary: string;
}

/**
 * עורך לוח קיים לפי פקודה חופשית בעברית. ⚠️ לא ממומש (Phase 4).
 * זורק שגיאה ברורה עד שחוזה ה-patch ייקבע — אסור להמציא תוצאה.
 */
export async function editBoard(_board: Board, command: string): Promise<EditBoardResult> {
  const trimmed = command.trim();
  if (!trimmed) throw new Error('יש להזין פקודת עריכה');

  // נתיב-הקריאה הסופי מוגדר (onCall 'aiBoard', action='edit'); כרגע השרת מחזיר unimplemented.
  // TODO(F4): לשלוח { action:'edit', board, command } ולהחיל את ה-patch המוחזר (diff, לא רינדור-מחדש).
  try {
    const fns = getFunctions(getApp(), FUNCTIONS_REGION);
    const call = httpsCallable(fns, 'aiBoard');
    await call({ action: 'edit', command: trimmed });
  } catch {
    // צפוי בשלב זה (unimplemented) — נכשל בחן עם הודעת-עברית למטה.
  }
  throw new Error('עריכת-AI שיחתית עדיין לא זמינה (בפיתוח)');
}
