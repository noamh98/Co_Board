// data/backupRepo.ts — גיבוי ייצוא/ייבוא JSON + היסטוריית גרסאות לשחזור (FR-022).
// עובד 100% offline. מחיקה = ארכוב (אינווריאנט HANDOFF §4).
// D-10 (3.8): פורמט 2 — הגיבוי כולל גם מדיה אישית (תמונות+הקלטות) ו-symbols אישיים,
// כך שייצוא מלא = portability אמיתית (GDPR Art. 20) ולא רק לוחות/פרופילים.

import {
  getDb,
  STORE_BOARDS,
  STORE_PROFILES,
  STORE_SETTINGS,
  STORE_VERSIONS,
  STORE_MEDIA,
  STORE_SYMBOLS,
} from './db';
import type { Board, Profile } from '../domain/models';
import type { MediaEntry } from './mediaRepo';
import type { SymbolEntry } from './symbolRepo';
import {
  assertValidBackup,
  isValidBoardRecord,
  isValidProfileRecord,
  isValidMediaBackupRecord,
  isValidSymbolBackupRecord,
  type MediaBackupRecord,
} from './backupValidation';

export interface BackupData {
  /** גרסת פורמט הגיבוי (לא DB_VERSION). 2 = כולל media+symbols (D-10). */
  backupFormat: 2;
  exportedAt: number;
  deviceId: string;
  boards: Board[];
  profiles: Profile[];
  settings: Record<string, unknown>;
  /** מדיה אישית (תמונות והקלטות) — blob כ-data-URI כדי להיות JSON-serializable. */
  media: MediaBackupRecord[];
  /** symbols אישיים (הקלטות/העלאות). ARASAAC לא מיוצא — ניתן לשחזור מהמקור. */
  symbols: SymbolEntry[];
}

/** קורא bytes מ-Blob; fallback ל-FileReader כי JSDOM (בדיקות) חסר blob.arrayBuffer. */
async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsArrayBuffer(blob);
  });
}

/** ממיר Blob ל-data-URI (base64). exported לבדיקות (JSDOM מאבד blobs ב-IDB המדומה). */
export async function blobToDataUri(blob: Blob, mimeType: string): Promise<string> {
  const bytes = await blobBytes(blob);
  const CHUNK = 0x8000; // 32KB — fromCharCode על מערך גדול זורק RangeError
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** ממיר data-URI חזרה ל-Blob. זורק על data-URI שאינו base64. exported לבדיקות. */
export function dataUriToBlob(dataUri: string, mimeType: string): Blob {
  const comma = dataUri.indexOf(',');
  if (comma === -1 || !dataUri.slice(0, comma).includes('base64')) {
    throw new Error('data-URI פגום בגיבוי');
  }
  const binary = atob(dataUri.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export interface VersionSnapshot {
  /** '{entityType}_{entityId}_{version}' */
  key: string;
  entityType: string;
  entityId: string;
  version: number;
  savedAt: number;
  data: unknown;
}

/** תקרת גרסאות שמורות לכל ישות — מעבר לזה הישנות נמחקות (D3). */
const MAX_VERSIONS_PER_ENTITY = 20;

function createBackupRepo() {
  async function exportBackup(deviceId: string): Promise<BackupData> {
    const db = await getDb();
    const [boards, profiles, settingsEntries, mediaEntries, symbolEntries] = await Promise.all([
      db.getAll(STORE_BOARDS) as Promise<Board[]>,
      db.getAll(STORE_PROFILES) as Promise<Profile[]>,
      db.getAll(STORE_SETTINGS),
      db.getAll(STORE_MEDIA) as Promise<MediaEntry[]>,
      db.getAll(STORE_SYMBOLS) as Promise<SymbolEntry[]>,
    ]);
    const settings: Record<string, unknown> = {};
    for (const entry of settingsEntries) {
      settings[(entry as { key: string }).key] = (entry as { value: unknown }).value;
    }

    // D-10: מדיה פעילה בלבד (archived = מחיקה רכה — לא מיוצאת); blob → data-URI.
    // רשומה עם blob בלתי-קריא מדולגת (לא מפילה את הייצוא כולו) — עדיף גיבוי חלקי מאפס.
    const media: MediaBackupRecord[] = (
      await Promise.all(
        mediaEntries
          .filter((e) => !e.archived)
          .map(async (e): Promise<MediaBackupRecord | null> => {
            try {
              return {
                id: e.id,
                cellId: e.cellId,
                profileId: e.profileId,
                mimeType: e.mimeType,
                dataUri: await blobToDataUri(e.blob, e.mimeType),
                encrypted: e.encrypted,
                source: e.source,
                createdAt: e.createdAt,
              };
            } catch {
              return null;
            }
          }),
      )
    ).filter((m): m is MediaBackupRecord => m !== null);

    // D-10: רק symbols אישיים (הקלטות/מצלמה/גלריה). ARASAAC משוחזר מהמקור — לא מנפחים גיבוי.
    const symbols = symbolEntries.filter((s) => s.source !== 'arasaac');

    return {
      backupFormat: 2,
      exportedAt: Date.now(),
      deviceId,
      boards,
      profiles,
      settings,
      media,
      symbols,
    };
  }

  // 3.5 (CR-E): הקלט מגיע מקובץ שהמשתמש בחר — עלול להיות פגום/זדוני. assertValidBackup
  // בודק את מעטפת-העל; isValid*Record מסנן רשומות בודדות פגומות (דוחה, לא שובר את ה-DB).
  // D-10: תומך גם בפורמט 1 (ללא media/symbols) — תאימות-לאחור לגיבויים ישנים.
  async function importBackup(raw: unknown): Promise<void> {
    assertValidBackup(raw);
    const boards = raw.boards.filter(isValidBoardRecord);
    const profiles = raw.profiles.filter(isValidProfileRecord);
    const settings = raw.settings;

    // המרת data-URI→Blob לפני הטרנזקציה (async אסור בתוך tx של idb).
    const mediaRecords: MediaEntry[] = (raw.media ?? [])
      .filter(isValidMediaBackupRecord)
      .flatMap((m) => {
        try {
          return [
            {
              id: m.id,
              cellId: m.cellId,
              profileId: m.profileId,
              mimeType: m.mimeType as MediaEntry['mimeType'],
              blob: dataUriToBlob(m.dataUri, m.mimeType),
              encrypted: m.encrypted,
              source: m.source as MediaEntry['source'],
              createdAt: m.createdAt,
            },
          ];
        } catch {
          return []; // רשומת מדיה פגומה — מדלגים, לא שוברים את הייבוא כולו
        }
      });
    const symbolRecords = (raw.symbols ?? []).filter(isValidSymbolBackupRecord);

    const db = await getDb();
    const tx = db.transaction(
      [STORE_BOARDS, STORE_PROFILES, STORE_SETTINGS, STORE_MEDIA, STORE_SYMBOLS],
      'readwrite',
    );

    for (const board of boards) {
      tx.objectStore(STORE_BOARDS).put(board);
    }
    for (const profile of profiles) {
      tx.objectStore(STORE_PROFILES).put(profile);
    }
    for (const [key, value] of Object.entries(settings)) {
      tx.objectStore(STORE_SETTINGS).put({ key, value });
    }
    for (const m of mediaRecords) {
      tx.objectStore(STORE_MEDIA).put(m);
    }
    for (const s of symbolRecords) {
      tx.objectStore(STORE_SYMBOLS).put(s);
    }
    await tx.done;
  }

  async function saveVersion(snap: Omit<VersionSnapshot, 'key'>): Promise<void> {
    const db = await getDb();
    const key = `${snap.entityType}_${snap.entityId}_${snap.version}`;
    await db.put(STORE_VERSIONS, { ...snap, key });

    // D3: תקרת שמירה — שומר רק את MAX_VERSIONS_PER_ENTITY הגרסאות האחרונות לכל ישות
    // (גרסאות נוצרות בכל conflict LWW → צמיחה בלתי-מוגבלת ללא תקרה).
    const all = (await db.getAll(STORE_VERSIONS)) as VersionSnapshot[];
    const forEntity = all
      .filter((v) => v.entityType === snap.entityType && v.entityId === snap.entityId)
      .sort((a, b) => b.version - a.version);
    if (forEntity.length > MAX_VERSIONS_PER_ENTITY) {
      await Promise.all(
        forEntity.slice(MAX_VERSIONS_PER_ENTITY).map((v) => db.delete(STORE_VERSIONS, v.key)),
      );
    }
  }

  async function listVersions(
    entityType: string,
    entityId: string,
  ): Promise<VersionSnapshot[]> {
    const db = await getDb();
    const all = (await db.getAll(STORE_VERSIONS)) as VersionSnapshot[];
    return all
      .filter((v) => v.entityType === entityType && v.entityId === entityId)
      .sort((a, b) => b.version - a.version);
  }

  async function restoreVersion(
    entityType: 'board' | 'profile',
    entityId: string,
    version: number,
  ): Promise<void> {
    const db = await getDb();
    const key = `${entityType}_${entityId}_${version}`;
    const snap = (await db.get(STORE_VERSIONS, key)) as VersionSnapshot | undefined;
    if (!snap) throw new Error(`גרסה לא נמצאה: ${key}`);
    const store = entityType === 'board' ? STORE_BOARDS : STORE_PROFILES;
    await db.put(store, snap.data);
  }

  return { exportBackup, importBackup, saveVersion, listVersions, restoreVersion };
}

export type BackupRepo = ReturnType<typeof createBackupRepo>;
export const backupRepo: BackupRepo = createBackupRepo();
