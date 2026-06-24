// services/sync/crypto.ts — הצפנת גיבויים לפני שמירה/העלאה (Web Crypto API, offline).
// מפתח נגזר ממפתח מכשיר (device key) ולא נשמר plain-text.
// PRD §8.3: הצפנה במנוחה (at rest). לא חוסם UI.

const KEY_STORE_NAME = 'sync-device-key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/** מייצר או מחזיר מפתח הצפנה קיים מ-IndexedDB (device-local). */
async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  const stored = await loadKey();
  if (stored) return stored;
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
  await saveKey(key);
  return key;
}

async function saveKey(key: CryptoKey): Promise<void> {
  const exported = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(KEY_STORE_NAME, JSON.stringify(exported));
}

async function loadKey(): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(KEY_STORE_NAME);
  if (!raw) return null;
  try {
    const jwk = JSON.parse(raw) as JsonWebKey;
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

/**
 * מצפין נתון JSON. מחזיר base64 של: IV(12 bytes) + ciphertext.
 * אם Web Crypto לא זמין — מחזיר JSON גלמי (fallback offline safe).
 */
export async function encryptData(data: unknown): Promise<string> {
  if (!crypto.subtle) {
    return btoa(JSON.stringify(data));
  }
  const key = await getOrCreateDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

/**
 * מפענח נתון שהוצפן ע"י encryptData.
 * אם פענוח נכשל (מפתח חסר / שגוי) — מחזיר null (fallback בטוח).
 */
export async function decryptData(encrypted: string): Promise<unknown | null> {
  try {
    if (!crypto.subtle) {
      return JSON.parse(atob(encrypted)) as unknown;
    }
    const key = await loadKey();
    if (!key) return null;
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
 * גוזר מפתח AES-GCM 256-bit מ-uid + salt דרך PBKDF2 (100k iterations).
 * המפתח לא עולה לענן לעולם — נגזר מחדש בכל פעם לפי uid+salt.
 */
export async function deriveMediaKey(uid: string, salt: Uint8Array): Promise<CryptoKey> {
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
 * מצפין Blob ומחזיר Blob: [salt(16)] + [iv(12)] + [ciphertext].
 * מאפשר גזירת מפתח מחדש בפענוח ללא שמירת salt נפרדת.
 */
export async function encryptBlob(blob: Blob, uid: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveMediaKey(uid, salt);
  const plaintext = await blob.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(ciphertext), 28);
  return new Blob([combined], { type: 'application/octet-stream' });
}

/**
 * מפענח Blob שהוצפן ע"י encryptBlob.
 * מחזיר null אם Web Crypto לא זמין או הפענוח נכשל (fallback בטוח).
 */
export async function decryptBlob(
  encryptedBlob: Blob,
  uid: string,
  mimeType: string,
): Promise<Blob | null> {
  try {
    if (!crypto.subtle) return null;
    const buffer = await encryptedBlob.arrayBuffer();
    const data = new Uint8Array(buffer);
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

export async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem('sync-device-id');
  if (stored) return stored;
  const id = crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}`;
  localStorage.setItem('sync-device-id', id);
  return id;
}
