// data/backupMedia.ts — קידוד/פענוח blobs של מדיה לגיבוי נייד (D-10, GDPR נשיאות Art.20).
// JSON אינו תומך ב-Blob → תמונות אישיות (STORE_MEDIA) מקודדות base64 לייצוא ומפוענחות בייבוא.
// אבטחה (D-02): לא נוגעים בהצפנה — דגל encrypted והבלוב (ייתכן ciphertext) נשמרים כפי-שהם,
// ללא פענוח וללא גישה למפתחות (cryptoKeys non-extractable). המרה סימטרית ותו לא.

import type { MediaEntry, MediaMimeType, MediaSource } from './mediaRepo';

/** רשומת מדיה מסודרת לייצוא — blob מקודד base64, שאר השדות כפי-שהם. */
export interface SerializedMediaEntry {
  id: string;
  cellId: string;
  profileId: string;
  mimeType: MediaMimeType;
  /** תוכן ה-blob מקודד base64 (ייתכן מוצפן — לא מפוענח). */
  dataBase64: string;
  encrypted: boolean;
  source: MediaSource;
  createdAt: number;
  syncedAt?: number;
  downloadUrl?: string;
  archived?: boolean;
}

// עיבוד ב-chunks של 32KB מונע חריגת stack ב-String.fromCharCode על בלובים גדולים.
const CHUNK = 0x8000;

/** ממיר Blob למחרוזת base64 (offline, ללא רשת). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** ממיר base64 חזרה ל-Blob עם ה-mimeType המקורי. */
export function base64ToBlob(dataBase64: string, mimeType: string): Blob {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/** מסדר רשומת מדיה לייצוא — הבלוב מקודד base64, המטא-דאטה נשמר כפי-שהוא. */
export async function serializeMediaEntry(entry: MediaEntry): Promise<SerializedMediaEntry> {
  const { blob, ...rest } = entry;
  return { ...rest, dataBase64: await blobToBase64(blob) };
}

/** מפענח רשומת מדיה מיובאת חזרה ל-MediaEntry עם Blob. */
export function deserializeMediaEntry(entry: SerializedMediaEntry): MediaEntry {
  const { dataBase64, ...rest } = entry;
  return { ...rest, blob: base64ToBlob(dataBase64, entry.mimeType) };
}
