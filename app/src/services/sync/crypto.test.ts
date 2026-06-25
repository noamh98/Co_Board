import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from '../../data/db';

// crypto.ts נשען על Web Crypto (subtle). בסביבות jsdom חלקיות subtle עשוי לחסר —
// במקרה כזה הבדיקות מדלגות בחן (skip) במקום להיכשל. ב-Node/CI (webcrypto מלא) הן רצות.
const subtleOk =
  typeof crypto !== 'undefined' &&
  !!crypto.subtle &&
  typeof crypto.subtle.generateKey === 'function' &&
  typeof new Blob([]).arrayBuffer === 'function';
const itc = subtleOk ? it : it.skip;

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(() => {
  resetIdb();
  localStorage.clear();
});

describe('crypto — B1 (מפתח non-extractable) / B2 (מדיה עטופת-מכשיר)', () => {
  itc('encryptData/decryptData round-trip; אין מפתח גלוי ב-localStorage (B1)', async () => {
    const { encryptData, decryptData } = await import('./crypto');
    const enc = await encryptData({ hello: 'שלום', n: 42 });
    const dec = (await decryptData(enc)) as { hello: string; n: number };
    expect(dec.hello).toBe('שלום');
    expect(dec.n).toBe(42);
    // התיקון: המפתח אינו נשמר ב-localStorage (היה JWK גלוי).
    expect(localStorage.getItem('sync-device-key')).toBeNull();
  });

  itc('מיגרציה: JWK ישן ב-localStorage מועבר ל-IDB ונמחק (B1)', async () => {
    const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const jwk = await crypto.subtle.exportKey('jwk', k);
    localStorage.setItem('sync-device-key', JSON.stringify(jwk));

    const { getDeviceKey } = await import('../../data/keyStore');
    const dk = await getDeviceKey();
    expect(dk).toBeTruthy();
    expect(dk.extractable).toBe(false);
    expect(localStorage.getItem('sync-device-key')).toBeNull();
  });

  itc('encryptBlob/decryptBlob round-trip — פורמט חדש (B2)', async () => {
    const { encryptBlob, decryptBlob } = await import('./crypto');
    const blob = new Blob(['secret-נתון'], { type: 'text/plain' });
    const enc = await encryptBlob(blob);
    const dec = await decryptBlob(enc, 'unused-uid', 'text/plain');
    expect(dec).not.toBeNull();
    expect(await dec!.text()).toBe('secret-נתון');
  });

  itc('decryptBlob מפענח פורמט ישן (uid-derived) — תאימות לאחור (B2)', async () => {
    const { deriveMediaKey, decryptBlob } = await import('./crypto');
    const uid = 'uid-legacy';
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveMediaKey(uid, salt as Uint8Array<ArrayBuffer>);
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('old-data')),
    );
    const combined = new Uint8Array(16 + 12 + ct.length);
    combined.set(salt, 0);
    combined.set(iv, 16);
    combined.set(ct, 28);

    const dec = await decryptBlob(new Blob([combined]), uid, 'text/plain');
    expect(dec).not.toBeNull();
    expect(await dec!.text()).toBe('old-data');
  });
});
