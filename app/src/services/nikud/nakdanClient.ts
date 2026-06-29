import type { NakdanFetcher } from './nikudService';
import { fetchWithTimeout } from '../http/fetchWithTimeout';

// לקוח ל-Nakdan (Dicta) להבאת ניקוד אוטומטי.
// ⚠️ רישוי (G2): ה-endpoint הציבורי שלהלן אינו מורשה רשמית לפרודקשן. יש להגדיר
// endpoint מורשה (Dicta API ברישוי) דרך VITE_NAKDAN_ENDPOINT. ללא הגדרה — נעשה
// שימוש בברירת המחדל לצורכי פיתוח בלבד, וכשל נופל חיננית ל-cache/ללא-ניקוד.
const DEFAULT_NAKDAN_URL = 'https://nakdan-2-0.loadbalancer.dicta.org.il/api';
const NAKDAN_URL =
  (import.meta.env.VITE_NAKDAN_ENDPOINT as string | undefined) || DEFAULT_NAKDAN_URL;

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
    // Phase 1 (H-API timeout): עטיפת ה-fetch ב-timeout (15ש') כדי שבקשת ניקוד תקועה
    // לא תיתלה — כשל מהיר מאפשר נפילה חיננית ל-cache/ללא-ניקוד.
    const resp = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'nakdan', data: text, genre: 'modern' }),
      },
      15000,
    );
    if (!resp.ok) throw new Error(`Nakdan HTTP ${resp.status}`);
    const data = (await resp.json()) as NakdanWord[];
    return joinNikud(data);
  };
}
