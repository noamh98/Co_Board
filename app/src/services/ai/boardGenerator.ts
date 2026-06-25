// services/ai/boardGenerator.ts — מחולל לוח מ-prompt (I8, "Smart Prompt" עברית).
// אורקסטרציה טהורה: ה-LLM וחיפוש הסמלים/ניקוד מוזרקים (deps) — אין כאן קריאת רשת ישירה.
// פרטיות: opt-in, ללא נתוני ילד, ה-prompt לא נשמר. כשל רשת = הזרקה שזורקת → נפילה חיננית למעלה.

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
  const words = await deps.llm(topic, count);

  const cells: Record<string, Cell> = {};
  const placements: CellPlacement[] = [];

  for (let i = 0; i < words.length && i < count; i++) {
    const { word, pos } = words[i];
    const id = `gen-${i}`;
    const fitz: Fitzgerald | undefined =
      (pos ? POS_TO_FITZ[pos] : undefined) ?? categoryForLabel(word);
    const symbolId = deps.findSymbol ? await deps.findSymbol(word) : undefined;
    const nikud = deps.getNikud ? await deps.getNikud(word) : undefined;

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
