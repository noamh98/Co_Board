// domain/prediction/predictor.ts — ניבוי מילה הבאה (I2). טהור, ללא I/O.
// מודל n-gram מקומי: תדירות יחידנית (unigram) + מעברים (bigram). למידה מקומית בלבד (פרטי).

export interface NgramModel {
  /** תדירות כל מילה. */
  unigram: Record<string, number>;
  /** מעברים: prevWord → { nextWord: count }. */
  bigram: Record<string, Record<string, number>>;
}

export function emptyModel(): NgramModel {
  return { unigram: {}, bigram: {} };
}

/** מעדכן את המודל ברצף מילים (אימרה). מחזיר מודל חדש (אימוטבילי). */
export function learn(model: NgramModel, sequence: string[]): NgramModel {
  const unigram = { ...model.unigram };
  const bigram: NgramModel['bigram'] = { ...model.bigram };
  for (let i = 0; i < sequence.length; i++) {
    const w = sequence[i];
    unigram[w] = (unigram[w] ?? 0) + 1;
    if (i > 0) {
      const prev = sequence[i - 1];
      bigram[prev] = { ...(bigram[prev] ?? {}) };
      bigram[prev][w] = (bigram[prev][w] ?? 0) + 1;
    }
  }
  return { unigram, bigram };
}

export interface Prediction {
  word: string;
  score: number;
}

/**
 * מנבא את המילים הבאות. משקל גבוה למעבר bigram מהמילה האחרונה, נפילה לתדירות יחידנית.
 * @param candidates אם ניתן — מגביל למילות הלוח (רלוונטיות). לא מציע את המילה האחרונה.
 */
export function predictNext(
  model: NgramModel,
  context: string[],
  opts: { topN?: number; candidates?: string[] } = {},
): Prediction[] {
  const topN = opts.topN ?? 5;
  const last = context[context.length - 1];
  const allow = opts.candidates ? new Set(opts.candidates) : null;
  const scores = new Map<string, number>();

  const transitions = last ? model.bigram[last] : undefined;
  if (transitions) {
    for (const [w, count] of Object.entries(transitions)) {
      if (w === last || (allow && !allow.has(w))) continue;
      scores.set(w, (scores.get(w) ?? 0) + count * 10); // משקל גבוה ל-bigram
    }
  }
  for (const [w, count] of Object.entries(model.unigram)) {
    if (w === last || (allow && !allow.has(w))) continue;
    scores.set(w, (scores.get(w) ?? 0) + count);
  }

  return [...scores.entries()]
    .map(([word, score]) => ({ word, score }))
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    .slice(0, topN);
}
