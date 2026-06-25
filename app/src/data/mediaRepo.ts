// data/mediaRepo.ts — אחסון תמונות אישיות ב-IndexedDB (offline-first, חלק 3).
// שונה מ-symbolRepo: ממוקד על תמונות אישיות (לא ARASAAC); תומך blob מוצפן.
// מחיקה = archived flag (לא הסרה) — אינווריאנט HANDOFF §Invariants.

import { getDb, STORE_MEDIA } from './db';

export type MediaMimeType = 'image/webp' | 'image/jpeg' | 'image/png';
export type MediaSource = 'camera' | 'gallery' | 'url';

export interface MediaEntry {
  id: string;
  cellId: string;
  profileId: string;
  mimeType: MediaMimeType;
  blob: Blob;
  encrypted: boolean;
  source: MediaSource;
  createdAt: number;
  syncedAt?: number;
  downloadUrl?: string;
  archived?: boolean;
}

export interface MediaRepo {
  saveMedia(entry: MediaEntry): Promise<void>;
  getMedia(id: string): Promise<MediaEntry | undefined>;
  listByProfile(profileId: string): Promise<MediaEntry[]>;
  /** מחיקה רכה — מציב archived:true; לא מסיר מה-DB (אינווריאנט). */
  deleteMedia(id: string): Promise<void>;
}

/**
 * D3: תקרת מדיה — מסיר לצמיתות רשומות מאורכבות (archived) ישנות מעבר ל-maxArchived.
 * מונע צמיחה בלתי-מוגבלת של blobs אחרי מחיקות רכות חוזרות. רשומות פעילות לא נוגעות.
 */
export async function pruneArchivedMedia(maxArchived = 50): Promise<void> {
  const db = await getDb();
  const all = (await db.getAll(STORE_MEDIA)) as MediaEntry[];
  const archived = all
    .filter((e) => e.archived)
    .sort((a, b) => b.createdAt - a.createdAt);
  if (archived.length <= maxArchived) return;
  await Promise.all(archived.slice(maxArchived).map((e) => db.delete(STORE_MEDIA, e.id)));
}

export function createMediaRepo(): MediaRepo {
  return {
    async saveMedia(entry) {
      const db = await getDb();
      await db.put(STORE_MEDIA, entry);
    },

    async getMedia(id) {
      const db = await getDb();
      return (await db.get(STORE_MEDIA, id)) as MediaEntry | undefined;
    },

    async listByProfile(profileId) {
      const db = await getDb();
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const index = tx.store.index('by-profile');
      const all = (await index.getAll(profileId)) as MediaEntry[];
      return all.filter((e) => !e.archived);
    },

    async deleteMedia(id) {
      const db = await getDb();
      const entry = (await db.get(STORE_MEDIA, id)) as MediaEntry | undefined;
      if (entry) {
        await db.put(STORE_MEDIA, { ...entry, archived: true });
      }
    },
  };
}
