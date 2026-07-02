import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { backupRepo } from './backupRepo';
import { resetDbForTests, getDb, STORE_BOARDS } from './db';
import type { Board } from '../domain/models';

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIdb);

const sampleBoard: Board = {
  id: 'b1',
  name: 'לוח בדיקה',
  grid: { rows: 4, cols: 4 },
  cells: {},
  placements: [],
};

describe('exportBackup / importBackup — round-trip', () => {
  it('יצוא וייבוא שומר לוחות ופרופילים', async () => {
    const db = await getDb();
    await db.put(STORE_BOARDS, sampleBoard);

    const backup = await backupRepo.exportBackup('dev-test');
    expect(backup.backupFormat).toBe(1);
    expect(backup.boards.some((b) => b.id === 'b1')).toBe(true);

    resetIdb();
    await backupRepo.importBackup(backup);
    const db2 = await getDb();
    const loaded = await db2.get(STORE_BOARDS, 'b1') as Board;
    expect(loaded.name).toBe('לוח בדיקה');
  });

  it('importBackup עם backupFormat שגוי — זורק (3.5: assertValidBackup)', async () => {
    await expect(
      backupRepo.importBackup({ backupFormat: 99 }),
    ).rejects.toThrow('פורמט הגיבוי אינו נתמך');
  });

  it('importBackup מסנן רשומות board/profile פגומות במקום לזרוק (3.5)', async () => {
    const backup = await backupRepo.exportBackup('dev-test');
    resetIdb();
    await backupRepo.importBackup({
      ...backup,
      boards: [sampleBoard, { garbage: true }],
      profiles: [{ garbage: true }],
    });
    const db = await getDb();
    const loaded = await db.get(STORE_BOARDS, 'b1') as Board;
    expect(loaded.name).toBe('לוח בדיקה');
  });
});

describe('saveVersion / listVersions / restoreVersion', () => {
  it('שומר גרסה ומחזיר ברשימה', async () => {
    await backupRepo.saveVersion({
      entityType: 'board',
      entityId: 'b1',
      version: 2,
      savedAt: 12345,
      data: sampleBoard,
    });
    const versions = await backupRepo.listVersions('board', 'b1');
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(2);
  });

  it('restoreVersion מחזיר נתונים ל-store', async () => {
    await backupRepo.saveVersion({
      entityType: 'board',
      entityId: 'b1',
      version: 1,
      savedAt: 100,
      data: sampleBoard,
    });
    await backupRepo.restoreVersion('board', 'b1', 1);
    const db = await getDb();
    const restored = await db.get(STORE_BOARDS, 'b1') as Board;
    expect(restored.name).toBe('לוח בדיקה');
  });

  it('restoreVersion עם גרסה לא קיימת — זורק', async () => {
    await expect(
      backupRepo.restoreVersion('board', 'no-such', 99),
    ).rejects.toThrow('גרסה לא נמצאה');
  });
});
