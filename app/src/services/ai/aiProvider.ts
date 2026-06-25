import type { PartOfSpeech } from '../../domain/models';
import type { GeneratedWord } from './boardGenerator';

const VALID_POS = new Set<string>([
  'noun', 'verb', 'adjective', 'pronoun', 'preposition', 'adverb', 'number', 'other',
]);

function toPos(s: string | undefined): PartOfSpeech | undefined {
  return s && VALID_POS.has(s) ? (s as PartOfSpeech) : undefined;
}

export function createLlmProvider(): (topic: string, count: number) => Promise<GeneratedWord[]> {
  return async (topic: string, count: number): Promise<GeneratedWord[]> => {
    const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
    if (!endpoint) {
      throw new Error('AI endpoint not configured');
    }

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count }),
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Network error');
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as { words: Array<{ word: string; pos?: string }> };
    return data.words.map((w) => ({
      word: w.word,
      ...(toPos(w.pos) ? { pos: toPos(w.pos) } : {}),
    }));
  };
}
