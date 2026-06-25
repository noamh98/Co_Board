// data/keyStore.ts — אחסון מפתח ההצפנה של המכשיר (B1).
// המפתח הוא CryptoKey עם extractable:false, מאוחסן ב-IndexedDB (store ייעודי).
// יתרון אבטחה: XSS/גישה מקומית אינם יכולים לייצא את חומר-המפתח (בניגוד ל-JWK ב-localStorage).

import { getDb, STORE_KEYS } from './db';

const KEY_ID = 'device-key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
/** מפתח JWK ישן ששמור גלוי ב-localStorage (לפני B1) — מהוגר ונמחק. */
const LEGACY_LS_KEY = 'sync-device-key';
// כולל wrapKey/unwrapKey כדי שיוכל לעטוף CEK של מדיה (B2).
const USAGES: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'];

interface StoredKey {
  id: string;
  key: CryptoKey;
}

/**
 * מחזיר את מפתח המכשיר (CryptoKey non-extractable). נוצר פעם אחת ונשמר ב-IDB.
 * מבצע מיגרציה רכה ממפתח JWK ישן ב-localStorage אם קיים (שומר על תאימות לגיבויים ישנים).
 */
export async function getDeviceKey(): Promise<CryptoKey> {
  const db = await getDb();
  const existing = (await db.get(STORE_KEYS, KEY_ID)) as StoredKey | undefined;
  if (existing?.key) return existing.key;

  const migrated = await migrateLegacyKey();
  if (migrated) {
    await db.put(STORE_KEYS, { id: KEY_ID, key: migrated });
    return migrated;
  }

  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // extractable:false — לא ניתן לייצוא
    USAGES,
  );
  await db.put(STORE_KEYS, { id: KEY_ID, key });
  return key;
}

/** מייבא מפתח ישן מ-localStorage כ-CryptoKey non-extractable ומוחק את ה-plaintext. */
async function migrateLegacyKey(): Promise<CryptoKey | null> {
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return null;
    const jwk = JSON.parse(raw) as JsonWebKey;
    // key_ops ב-JWK ישן אינו כולל wrapKey/unwrapKey — הסרה מאפשרת import עם USAGES מורחבים.
    const { key_ops: _ignored, ...jwkClean } = jwk;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwkClean,
      { name: ALGORITHM, length: KEY_LENGTH },
      false, // גם אם המקור היה extractable — מיובא כלא-ניתן-לייצוא
      USAGES,
    );
    localStorage.removeItem(LEGACY_LS_KEY); // הסרת המפתח הגלוי (תיקון B1)
    return key;
  } catch {
    return null;
  }
}

/** עוזר לבדיקות: האם נותר מפתח גלוי ב-localStorage (אמור להיות false). */
export function hasLegacyLocalStorageKey(): boolean {
  try {
    return localStorage.getItem(LEGACY_LS_KEY) !== null;
  } catch {
    return false;
  }
}
