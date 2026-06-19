import { getDb, STORE_NIKUD } from '../../data/db';
import type { CacheEntry, NikudCache } from './nikudService';

// מימוש cache הניקוד מעל IndexedDB (Offline-first; נשמר בין מופעים).
export function createIdbNikudCache(): NikudCache {
  return {
    async get(text: string): Promise<CacheEntry | undefined> {
      const db = await getDb();
      return (await db.get(STORE_NIKUD, text)) as CacheEntry | undefined;
    },
    async set(entry: CacheEntry): Promise<void> {
      const db = await getDb();
      await db.put(STORE_NIKUD, entry);
    },
  };
}
