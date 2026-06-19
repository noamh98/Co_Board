import { openDB, type IDBPDatabase } from 'idb';

// שכבת Data — מקור האמת המקומי (Offline-first, HANDOFF §3/§4).
// כרגע: store לניקוד (cache + override ידני). יורחב ב-M1 (לוחות/פרופילים).

export const DB_NAME = 'luach-aac';
export const DB_VERSION = 1;
export const STORE_NIKUD = 'nikud';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NIKUD)) {
          db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        }
      },
    });
  }
  return dbPromise;
}
