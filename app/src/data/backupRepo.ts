// data/backupRepo.ts — גיבוי ייצוא/ייבוא JSON + היסטוריית גרסאות לשחזור (FR-022).
// עובד 100% offline. מחיקה = ארכוב (אינווריאנט HANDOFF §4).

import { getDb, STORE_BOARDS, STORE_PROFILES, STORE_SETTINGS, STORE_VERSIONS } from './db';
import type { Board, Profile } from '../domain/models';

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

  async function importBackup(backup: BackupData): Promise<void> {
    if (backup.backupFormat !== 1) {
      throw new Error(`גרסת גיבוי לא נתמכת: ${backup.backupFormat as number}`);
    }
    const db = await getDb();
    const tx = db.transaction([STORE_BOARDS, STORE_PROFILES, STORE_SETTINGS], 'readwrite');

    for (const board of backup.boards) {
      tx.objectStore(STORE_BOARDS).put(board);
    }
    for (const profile of backup.profiles) {
      tx.objectStore(STORE_PROFILES).put(profile);
    }
    for (const [key, value] of Object.entries(backup.settings)) {
      tx.objectStore(STORE_SETTINGS).put({ key, value });
    }
    await tx.done;
  }

  async function saveVersion(snap: Omit<VersionSnapshot, 'key'>): Promise<void> {
    const db = await getDb();
    const key = `${snap.entityType}_${snap.entityId}_${snap.version}`;
    await db.put(STORE_VERSIONS, { ...snap, key });
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
