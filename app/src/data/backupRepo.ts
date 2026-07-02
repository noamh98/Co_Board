// data/backupRepo.ts — גיבוי ייצוא/ייבוא JSON + היסטוריית גרסאות לשחזור (FR-022).
// עובד 100% offline. מחיקה = ארכוב (אינווריאנט HANDOFF §4).

import { getDb, STORE_BOARDS, STORE_PROFILES, STORE_SETTINGS, STORE_VERSIONS } from './db';
import type { Board, Profile } from '../domain/models';
import { assertValidBackup, isValidBoardRecord, isValidProfileRecord } from './backupValidation';

export interface BackupData {
  /** גרסת פורמט הגיבוי (לא DB_VERSION) */
  backupFormat: 1;
  exportedAt: number;
  deviceId: string;
  boards: Board[];
  profiles: Profile[];
  settings: Record<string, unknown>;
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
    const [boards, profiles, settingsEntries] = await Promise.all([
      db.getAll(STORE_BOARDS) as Promise<Board[]>,
      db.getAll(STORE_PROFILES) as Promise<Profile[]>,
      db.getAll(STORE_SETTINGS),
    ]);
    const settings: Record<string, unknown> = {};
    for (const entry of settingsEntries) {
      settings[(entry as { key: string }).key] = (entry as { value: unknown }).value;
    }
    return {
      backupFormat: 1,
      exportedAt: Date.now(),
      deviceId,
      boards,
      profiles,
      settings,
    };
  }

  // 3.5 (CR-E): הקלט מגיע מקובץ שהמשתמש בחר — עלול להיות פגום/זדוני. assertValidBackup
  // בודק את מעטפת-העל; isValid*Record מסנן רשומות בודדות פגומות (דוחה, לא שובר את ה-DB).
  async function importBackup(raw: unknown): Promise<void> {
    assertValidBackup(raw);
    const boards = raw.boards.filter(isValidBoardRecord);
    const profiles = raw.profiles.filter(isValidProfileRecord);
    const settings = raw.settings;

    const db = await getDb();
    const tx = db.transaction([STORE_BOARDS, STORE_PROFILES, STORE_SETTINGS], 'readwrite');

    for (const board of boards) {
      tx.objectStore(STORE_BOARDS).put(board);
    }
    for (const profile of profiles) {
      tx.objectStore(STORE_PROFILES).put(profile);
    }
    for (const [key, value] of Object.entries(settings)) {
      tx.objectStore(STORE_SETTINGS).put({ key, value });
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
