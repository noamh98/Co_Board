import type { NakdanFetcher } from './nikudService';

// לקוח ל-Nakdan (Dicta) להבאת ניקוד אוטומטי.
// ⚠️ TODO (סיכון HANDOFF §9.6): לאשר endpoint רשמי + רישוי שימוש לפני production,
// ולשקול ספק חלופי. הפרסור כאן best-effort ונשען על מבנה התגובה הציבורי הידוע.

const NAKDAN_URL = 'https://nakdan-2-0.loadbalancer.dicta.org.il/api';

interface NakdanOption {
  w: string;
}
interface NakdanWord {
  word: string;
  options?: NakdanOption[];
  sep?: boolean;
}

function joinNikud(words: NakdanWord[]): string {
  return words
    .map((w) => (w.options && w.options.length > 0 ? w.options[0].w : w.word))
    .join('');
}

export function createNakdanFetcher(url: string = NAKDAN_URL): NakdanFetcher {
  return async (text: string): Promise<string> => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'nakdan', data: text, genre: 'modern' }),
    });
    if (!resp.ok) throw new Error(`Nakdan HTTP ${resp.status}`);
    const data = (await resp.json()) as NakdanWord[];
    return joinNikud(data);
  };
}
