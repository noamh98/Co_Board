import { openDB, type IDBPDatabase } from 'idb';

// שכבת Data — מקור האמת המקומי (Offline-first, HANDOFF §3/§4).
// v1: store ניקוד בלבד. v2 (M1): נוספו boards/profiles/settings. v3: נוסף symbols.
// v4 (M5): נוספו outbox (שינויים ממתינים ל-sync) ו-versions (היסטוריה לשחזור).
// v5 (M7): נוסף usage (אנליטיקה אנונימית, opt-in בלבד).
// v6 (M8): נוסף symbolCache (ARASAAC blobs, offline-first).
// v7 (M10): נוסף phrases (בנק משפטים שמורים).
// v8 (M17): מיגרציה — entries של הקלטות קוליות (source='recording') תוקנו
//           ל-mimeType='audio/webm' (היה שגוי: 'image/webp').
// v9 (M18): נוסף audioCache (TTS blobs, hybrid offline-first).
// v10 (חלק 3): נוסף media (תמונות אישיות, offline-first + סנכרון מוצפן אופציונלי).
// v11 (B1): נוסף cryptoKeys — מפתח הצפנה non-extractable כ-CryptoKey (לא JWK ב-localStorage).
// אינווריאנט מיגרציה: upgrade אדיטיבי בלבד — נתוני v1 (ניקוד) שורדים שדרוג.

export const DB_NAME = 'luach-aac';
export const DB_VERSION = 11;

export const STORE_NIKUD = 'nikud';
export const STORE_BOARDS = 'boards';
export const STORE_PROFILES = 'profiles';
export const STORE_SETTINGS = 'settings';
export const STORE_SYMBOLS = 'symbols';
export const STORE_OUTBOX = 'outbox';
export const STORE_VERSIONS = 'versions';
export const STORE_USAGE = 'usage';
export const STORE_SYMBOL_CACHE = 'symbolCache';
export const STORE_PHRASES = 'phrases';
export const STORE_AUDIO_CACHE = 'audioCache';
export const STORE_MEDIA = 'media';
export const STORE_KEYS = 'cryptoKeys';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // idb מריץ upgrade פעם אחת לכל מעבר גרסה. createObjectStore נכשל אם ה-store
      // כבר קיים, ולכן הבדיקה idempotent — בטוח גם בשדרוג v1→v2 וגם בהתקנה נקייה.
      async upgrade(db, oldVersion, _newVersion, tx) {
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
        if (!db.objectStoreNames.contains(STORE_USAGE)) {
          const usageStore = db.createObjectStore(STORE_USAGE, { keyPath: 'id' });
          usageStore.createIndex('by-profile', 'profileId', { unique: false });
          usageStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SYMBOL_CACHE)) {
          db.createObjectStore(STORE_SYMBOL_CACHE, { keyPath: 'arasaacId' });
        }
        if (!db.objectStoreNames.contains(STORE_PHRASES)) {
          const phrasesStore = db.createObjectStore(STORE_PHRASES, { keyPath: 'id' });
          phrasesStore.createIndex('by-profile', 'profileId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_AUDIO_CACHE)) {
          db.createObjectStore(STORE_AUDIO_CACHE, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          const mediaStore = db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
          mediaStore.createIndex('by-profile', 'profileId', { unique: false });
        }
        // v11 (B1): מפתח הצפנה non-extractable מאוחסן כ-CryptoKey (לא ניתן לייצוא ב-XSS).
        if (!db.objectStoreNames.contains(STORE_KEYS)) {
          db.createObjectStore(STORE_KEYS, { keyPath: 'id' });
        }

        // v8: תיקון mimeType להקלטות קוליות — היה 'image/webp' בטעות (HANDOFF §4).
        if (oldVersion < 8 && db.objectStoreNames.contains(STORE_SYMBOLS)) {
          const store = tx.objectStore(STORE_SYMBOLS);
          const all = await store.getAll();
          for (const entry of all) {
            if (entry.source === 'recording' && entry.mimeType === 'image/webp') {
              await store.put({ ...entry, mimeType: 'audio/webm' });
            }
          }
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
