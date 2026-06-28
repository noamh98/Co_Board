// services/ai/boardGenerator.ts — מחולל לוח מ-prompt (I8, "Smart Prompt" עברית).
// אורקסטרציה טהורה: ה-LLM וחיפוש הסמלים/ניקוד מוזרקים (deps) — אין כאן קריאת רשת ישירה.
// פרטיות: opt-in, ללא נתוני ילד, ה-prompt לא נשמר. כשל רשת = הזרקה שזורקת → נפילה חיננית למעלה.
//
// Phase 1 (F2, "דקה"): העשרת symbol+nikud עברה מטורית (N+1, ~36 round-trips ללוח 6×6)
// ל-Promise.all מקבילי — האצה פי 10–30. ה-cache ללוחות AI מנוהל ע"י הקורא (data/aiBoardCache),
// כדי לשמור על טוהר המודול (ללא תלות בשכבת data).

import type { Board, Cell, CellPlacement, Fitzgerald, GridSize, PartOfSpeech } from '../../domain/models';
import { categoryForLabel } from '../../domain/fitzgerald';

export interface GeneratedWord {
  word: string;
  pos?: PartOfSpeech;
}

export interface BoardGeneratorDeps {
  /** מזמן LLM: נושא + מספר מילים → מילים+POS. מוזרק (אופ-אין). */
  llm: (topic: string, count: number) => Promise<GeneratedWord[]>;
  /** חיפוש symbolId של סמל ARASAAC למילה (אופציונלי). */
  findSymbol?: (word: string) => Promise<string | undefined>;
  /** ניקוד אוטומטי (אופציונלי). */
  getNikud?: (word: string) => Promise<string | undefined>;
}

const POS_TO_FITZ: Partial<Record<PartOfSpeech, Fitzgerald>> = {
  verb: 'verb',
  noun: 'noun',
  adjective: 'adjective',
  pronoun: 'pronoun',
  preposition: 'preposition',
  adverb: 'adverb',
};

/**
 * מחולל לוח: נושא + גודל → מילים (LLM) → תאים עם Fitzgerald + סמל + ניקוד + POS.
 * human-in-the-loop: הקורא אמור להציג תצוגה מקדימה לפני שמירה.
 */
export async function generateBoard(
  topic: string,
  size: GridSize,
  deps: BoardGeneratorDeps,
): Promise<Board> {
  const count = Math.max(1, size.rows * size.cols);
  const words = (await deps.llm(topic, count)).slice(0, count);

  // F2: העשרה מקבילית — כל חיפושי הסמל+ניקוד יוצאים יחד (Promise.all), לא טורי פר-מילה.
  const enriched = await Promise.all(
    words.map(async ({ word }) => {
      const [symbolId, nikud] = await Promise.all([
        deps.findSymbol ? deps.findSymbol(word) : Promise.resolve(undefined),
        deps.getNikud ? deps.getNikud(word) : Promise.resolve(undefined),
      ]);
      return { symbolId, nikud };
    }),
  );

  const cells: Record<string, Cell> = {};
  const placements: CellPlacement[] = [];

  for (let i = 0; i < words.length; i++) {
    const { word, pos } = words[i];
    const { symbolId, nikud } = enriched[i];
    const id = `gen-${i}`;
    const fitz: Fitzgerald | undefined =
      (pos ? POS_TO_FITZ[pos] : undefined) ?? categoryForLabel(word);

    cells[id] = {
      id,
      label: word,
      action: { type: 'speak' },
      ...(fitz ? { fitzgerald: fitz } : {}),
      ...(symbolId ? { symbolId } : {}),
      ...(nikud ? { nikud } : {}),
      ...(pos ? { morphology: { pos } } : {}),
    };
    placements.push({ cellId: id, row: Math.floor(i / size.cols), col: i % size.cols });
  }

  return {
    id: `ai-${Date.now()}`,
    name: topic,
    grid: size,
    cells,
    placements,
  };
}
