// services/sync/mediaSync.ts — סנכרון תמונות אישיות מוצפנות לענן (חלק 3).
// אינווריאנטים:
//   - הצפנה client-side לפני כל העלאה; key לא עולה לענן.
//   - syncEnabled=false → לא נקרא (App.tsx אחראי).
//   - offline-first: כשל העלאה לא מוחק את הנתון המקומי.

import type { MediaEntry, MediaRepo } from '../../data/mediaRepo';
import type { StorageProvider } from './storageProvider';
import { encryptBlob, decryptBlob } from './crypto';

/** Path ב-Storage לתמונה: profiles/{profileId}/media/{mediaId} */
function storagePath(profileId: string, mediaId: string): string {
  return `profiles/${profileId}/media/${mediaId}`;
}

/**
 * מעלה תמונה אישית לענן:
 *   a. encrypt blob (AES-GCM + PBKDF2 מ-uid+salt)
 *   b. upload ל-Storage
 *   c. עדכן MediaEntry.syncedAt + downloadUrl ב-mediaRepo
 * מחזיר downloadUrl בהצלחה; זורק שגיאה בכשל (מטפל בסביבת קריאה).
 */
export async function uploadMedia(
  uid: string,
  entry: MediaEntry,
  storageProvider: StorageProvider,
  repo: MediaRepo,
): Promise<string> {
  const encrypted = await encryptBlob(entry.blob, uid);
  const path = storagePath(entry.profileId, entry.id);
  const downloadUrl = await storageProvider.upload(path, encrypted);
  const updated: MediaEntry = {
    ...entry,
    syncedAt: Date.now(),
    downloadUrl,
  };
  await repo.saveMedia(updated);
  return downloadUrl;
}

/**
 * מוריד תמונה מוצפנת מהענן ושומרה מקומית:
 *   a. download מ-Storage → encryptedBlob
 *   b. decrypt → blob מקורי
 *   c. שמור ב-mediaRepo
 * מחזיר null אם הפענוח נכשל (fallback בטוח).
 */
export async function downloadMedia(
  uid: string,
  profileId: string,
  mediaId: string,
  mimeType: string,
  storageProvider: StorageProvider,
  repo: MediaRepo,
): Promise<Blob | null> {
  const path = storagePath(profileId, mediaId);
  const encryptedBlob = await storageProvider.download(path);
  const blob = await decryptBlob(encryptedBlob, uid, mimeType);
  if (!blob) return null;

  const existing = await repo.getMedia(mediaId);
  if (existing) {
    await repo.saveMedia({ ...existing, blob, syncedAt: Date.now() });
  }
  return blob;
}

/**
 * מוחק תמונה מה-Storage (פעולה נפרדת מהמחיקה המקומית).
 * כשל מחיקה מרחוק לא פוגע בנתון המקומי.
 */
export async function deleteMediaFromStorage(
  profileId: string,
  mediaId: string,
  storageProvider: StorageProvider,
): Promise<void> {
  const path = storagePath(profileId, mediaId);
  await storageProvider.delete(path);
}
