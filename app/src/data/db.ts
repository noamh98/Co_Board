import { openDB, type IDBPDatabase } from 'idb';

// שכבת Data — מקור האמת המקומי (Offline-first, HANDOFF §3/§4).
// v1: store ניקוד בלבד. v2 (M1): נוספו boards/profiles/settings. v3: נוסף symbols.
// v4 (M5): נוספו outbox (שינויים ממתינים ל-sync) ו-versions (היסטוריה לשחזור).
// אינווריאנט מיגרציה: upgrade אדיטיבי בלבד — נתוני v1 (ניקוד) שורדים שדרוג.

export const DB_NAME = 'luach-aac';
export const DB_VERSION = 4;

export const STORE_NIKUD = 'nikud';
export const STORE_BOARDS = 'boards';
export const STORE_PROFILES = 'profiles';
export const STORE_SETTINGS = 'settings';
export const STORE_SYMBOLS = 'symbols';
export const STORE_OUTBOX = 'outbox';
export const STORE_VERSIONS = 'versions';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // idb מריץ upgrade פעם אחת לכל מעבר גרסה. createObjectStore נכשל אם ה-store
      // כבר קיים, ולכן הבדיקה idempotent — בטוח גם בשדרוג v1→v2 וגם בהתקנה נקייה.
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NIKUD)) {
          db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        }
        if (!db.objectStoreNames.contains(STORE_BOARDS)) {
          db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PROFILES)) {
          db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SYMBOLS)) {
          db.createObjectStore(STORE_SYMBOLS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
          db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
          // keyPath: 'key' — פורמט: '{entityType}_{entityId}_{version}'
          db.createObjectStore(STORE_VERSIONS, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** מאפס את ה-singleton (לבדיקות בלבד — מאפשר פתיחה מחדש מול IDBFactory נקי). */
export function resetDbForTests(): void {
  dbPromise = null;
}
