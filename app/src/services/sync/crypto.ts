// services/sync/crypto.ts — הצפנת גיבויים/מדיה לפני שמירה/העלאה (Web Crypto API, offline).
// B1: מפתח המכשיר הוא CryptoKey non-extractable מ-data/keyStore (לא JWK ב-localStorage).
// B2: מדיה מוצפנת ב-CEK אקראי לכל קובץ, עטוף במפתח-המכשיר (לא נגזר מ-uid).
// PRD §8.3: הצפנה במנוחה (at rest). לא חוסם UI.
//
// Phase 0 (CR-3, E2EE fail-loud): כשאין crypto.subtle (לא-HTTPS / WebView ישן) — *זורקים*
// במקום fallback ל-base64. "הצפנה" הפיכה-טריוויאלית של נתוני ילדים אסורה בשקט.

import { getDeviceKey } from '../../data/keyStore';
import { getDeviceId as getDeviceIdFromStore } from '../../data/deviceId';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
/** חתימת פורמט מדיה חדש (B2): 'CB02' — מבדיל מהפורמט הישן (salt+iv+ct). */
const MEDIA_MAGIC = [0x43, 0x42, 0x30, 0x32] as const; // "CB02"

/** הודעת-שגיאה אחידה כשהדפדפן אינו תומך ב-Web Crypto (להצגה ב-UI). */
export const E2EE_UNAVAILABLE =
  'הצפנה אינה זמינה בדפדפן זה (נדרש חיבור מאובטח HTTPS). הסנכרון המוצפן הושבת.';

function assertSubtle(): void {
  if (!crypto?.subtle) {
    throw new Error(E2EE_UNAVAILABLE);
  }
}

/**
 * מצפין נתון JSON. מחזיר base64 של: IV(12 bytes) + ciphertext.
 * CR-3: אם Web Crypto לא זמין — זורק (לא מחזיר base64 גלמי "מוצפן" לכאורה).
 */
export async function encryptData(data: unknown): Promise<string> {
  assertSubtle();
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(uint8ToBinary(combined));
}

/**
 * ממיר Uint8Array למחרוזת בינארית בצ'אנקים (E3).
 * String.fromCharCode(...arr) על מערך גדול זורק RangeError (גיבוי גדול) — צ'אנקים פותרים.
 */
function uint8ToBinary(bytes: Uint8Array): string {
  const CHUNK = 0x8000; // 32KB
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return binary;
}

/**
 * מפענח נתון שהוצפן ע"י encryptData.
 * CR-3: אם crypto.subtle חסר — זורק (נתפס → null). לא מנסה "לפענח" base64 גלמי.
 * אם פענוח נכשל (מפתח חסר / שגוי) — מחזיר null (fallback בטוח).
 */
export async function decryptData(encrypted: string): Promise<unknown | null> {
  try {
    assertSubtle();
    const key = await getDeviceKey();
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const plain = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plain)) as unknown;
  } catch {
    return null;
  }
}

/**
 * @deprecated B2 — נשמר אך ורק לפענוח מדיה בפורמט הישן (uid-derived).
 * חולשה: uid אינו סודי → כל מי שמכירו (כולל אדמין) יכול היה לפענח. הצפנה חדשה
 * משתמשת ב-CEK אקראי עטוף במפתח-המכשיר (encryptBlob) ואינה נוגעת ב-uid.
 */
export async function deriveMediaKey(uid: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(uid),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * מצפין Blob (B2). פורמט: ['CB02'(4)] [wrapIv(12)] [wrappedLen(2)] [wrappedCEK] [dataIv(12)] [ciphertext].
 * CEK אקראי לכל קובץ, עטוף במפתח-המכשיר (non-extractable). uid אינו חומר-מפתח.
 * CR-3: זורק כשאין crypto.subtle (לא מעלה מדיה לא-מוצפנת בשקט).
 */
export async function encryptBlob(blob: Blob, _uid?: string): Promise<Blob> {
  assertSubtle();
  const deviceKey = await getDeviceKey();
  const cek = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // חייב להיות ניתן-לעטיפה (wrapKey דורש extractable)
    ['encrypt', 'decrypt'],
  );
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(
    await crypto.subtle.wrapKey('raw', cek, deviceKey, { name: ALGORITHM, iv: wrapIv }),
  );
  const dataIv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await blob.arrayBuffer();
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALGORITHM, iv: dataIv }, cek, plaintext),
  );

  const wrappedLen = wrapped.byteLength;
  const out = new Uint8Array(4 + 12 + 2 + wrappedLen + 12 + ciphertext.byteLength);
  let o = 0;
  out.set(MEDIA_MAGIC, o); o += 4;
  out.set(wrapIv, o); o += 12;
  out[o] = (wrappedLen >> 8) & 0xff;
  out[o + 1] = wrappedLen & 0xff;
  o += 2;
  out.set(wrapped, o); o += wrappedLen;
  out.set(dataIv, o); o += 12;
  out.set(ciphertext, o);
  return new Blob([out], { type: 'application/octet-stream' });
}

/**
 * מפענח Blob שהוצפן ע"י encryptBlob. מזהה אוטומטית פורמט חדש (CB02, עטוף-מכשיר)
 * מול הפורמט הישן (uid-derived) ומפענח בהתאם — תאימות-לאחור מלאה.
 * מחזיר null אם Web Crypto לא זמין או הפענוח נכשל (fallback בטוח).
 */
export async function decryptBlob(
  encryptedBlob: Blob,
  uid: string,
  mimeType: string,
): Promise<Blob | null> {
  try {
    if (!crypto?.subtle) return null;
    const data = new Uint8Array(await encryptedBlob.arrayBuffer());

    const isNew =
      data.length >= 4 &&
      data[0] === MEDIA_MAGIC[0] &&
      data[1] === MEDIA_MAGIC[1] &&
      data[2] === MEDIA_MAGIC[2] &&
      data[3] === MEDIA_MAGIC[3];

    if (isNew) {
      let o = 4;
      const wrapIv = data.slice(o, o + 12); o += 12;
      const wrappedLen = (data[o] << 8) | data[o + 1]; o += 2;
      const wrapped = data.slice(o, o + wrappedLen); o += wrappedLen;
      const dataIv = data.slice(o, o + 12); o += 12;
      const ciphertext = data.slice(o);
      const deviceKey = await getDeviceKey();
      const cek = await crypto.subtle.unwrapKey(
        'raw',
        wrapped,
        deviceKey,
        { name: ALGORITHM, iv: wrapIv },
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['decrypt'],
      );
      const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv: dataIv }, cek, ciphertext);
      return new Blob([plaintext], { type: mimeType });
    }

    // פורמט ישן (uid-derived): [salt(16)] [iv(12)] [ciphertext].
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const ciphertext = data.slice(28);
    const key = await deriveMediaKey(uid, salt);
    const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
    return new Blob([plaintext], { type: mimeType });
  } catch {
    return null;
  }
}

/**
 * מזהה המכשיר. Phase 0 (CR-6): עבר ל-IDB (data/deviceId) — לא עוד localStorage.
 * נשמר כאן כ-re-export לתאימות עם callers קיימים (firebaseProvider, BackupPanel).
 */
export async function getDeviceId(): Promise<string> {
  return getDeviceIdFromStore();
}
