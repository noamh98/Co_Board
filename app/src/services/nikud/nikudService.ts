// שירות ניקוד עברי. מקור-האמת: PRD §4.3 (ניקוד אוטומטי + תיקון ידני), §9.3.
// אינווריאנט (HANDOFF §4): cache מקומי + תיקון ידני שנשמר; ללא תלות ברשת בשימוש חוזר.
// עדיפות מובטחת: ידני (manual) > cache (nakdan) > רשת (Nakdan) > גלם (none / אופליין).

export type NikudSource = 'manual' | 'nakdan' | 'none';

export interface NikudResult {
  text: string;
  nikud: string;
  source: NikudSource;
}

export interface CacheEntry {
  text: string;
  nikud: string;
  source: 'manual' | 'nakdan';
  updatedAt: number;
}

/** פורט (port) ל-cache — מומש ע"י IndexedDB (nikudCache) או ע"י mock בבדיקות. */
export interface NikudCache {
  get(text: string): Promise<CacheEntry | undefined>;
  set(entry: CacheEntry): Promise<void>;
}

/** מביא ניקוד מהרשת (Nakdan); זורק שגיאה אם אין רשת/כשל. */
export type NakdanFetcher = (text: string) => Promise<string>;

export class NikudService {
  constructor(
    private cache: NikudCache,
    private fetcher?: NakdanFetcher,
    private isOnline: () => boolean = () =>
      typeof navigator === 'undefined' ? false : navigator.onLine,
  ) {}

  async getNikud(text: string): Promise<NikudResult> {
    const key = text.trim();
    if (!key) return { text, nikud: text, source: 'none' };

    const cached = await this.cache.get(key);
    if (cached?.source === 'manual') {
      // תיקון ידני תמיד מנצח — לעולם לא נדרס ולא נשלח לרשת.
      return { text: key, nikud: cached.nikud, source: 'manual' };
    }
    if (cached) {
      return { text: key, nikud: cached.nikud, source: 'nakdan' };
    }

    if (this.fetcher && this.isOnline()) {
      try {
        const nikud = await this.fetcher(key);
        if (nikud) {
          await this.cache.set({
            text: key,
            nikud,
            source: 'nakdan',
            updatedAt: Date.now(),
          });
          return { text: key, nikud, source: 'nakdan' };
        }
      } catch {
        // נפילה חיננית — נמשיך לאופליין ללא שגיאה למשתמש.
      }
    }

    // אופליין / אין תוצאה: מחזירים את הטקסט כפי שהוא, ללא ניקוד וללא שגיאה.
    return { text: key, nikud: key, source: 'none' };
  }

  /** שמירת תיקון ניקוד ידני לתא — לא יידרס ע"י הרשת לעולם. */
  async setManual(text: string, nikud: string): Promise<void> {
    await this.cache.set({
      text: text.trim(),
      nikud,
      source: 'manual',
      updatedAt: Date.now(),
    });
  }
}
