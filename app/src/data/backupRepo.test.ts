import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { backupRepo } from './backupRepo';
import { resetDbForTests, getDb, STORE_BOARDS, STORE_MEDIA, STORE_SYMBOLS } from './db';
import type { Board } from '../domain/models';
import type { MediaEntry } from './mediaRepo';
import type { SymbolEntry } from './symbolRepo';

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

function makeMedia(overrides?: Partial<MediaEntry>): MediaEntry {
  return {
    id: 'media-1',
    cellId: 'cell-1',
    profileId: 'profile-a',
    mimeType: 'image/webp',
    blob: new Blob(['שלום-media'], { type: 'image/webp' }),
    encrypted: false,
    source: 'gallery',
    createdAt: 1000,
    ...overrides,
  };
}

const sampleRecording: SymbolEntry = {
  id: 'rec-1',
  uri: 'data:audio/webm;base64,AAAA',
  mimeType: 'audio/webm',
  source: 'recording',
  createdAt: 2000,
};

describe('exportBackup / importBackup — round-trip', () => {
  it('ייצוא ויבוא שומר לוחות ופרופילים', async () => {
    const db = await getDb();
    await db.put(STORE_BOARDS, sampleBoard);

    const backup = await backupRepo.exportBackup('dev-test');
    expect(backup.backupFormat).toBe(2);
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

describe('exportBackup / importBackup — מדיה + קול (D-10)', () => {
  it('מייצא ומייבא תמונה אישית (תוכן ה-blob נשמר)', async () => {
    const db = await getDb();
    await db.put(STORE_MEDIA, makeMedia());

    const backup = await backupRepo.exportBackup('dev-test');
    expect(backup.media).toHaveLength(1);
    expect(backup.media[0].id).toBe('media-1');
    expect(typeof backup.media[0].dataBase64).toBe('string');
    expect(backup.media[0].dataBase64.length).toBeGreaterThan(0);

    resetIdb();
    await backupRepo.importBackup(backup);
    const db2 = await getDb();
    const restored = await db2.get(STORE_MEDIA, 'media-1') as MediaEntry;
    expect(restored.profileId).toBe('profile-a');
    expect(await restored.blob.text()).toBe('שלום-media');
  });

  it('שומר את דגל encrypted כפי-שהוא ללא פענוח (D-02)', async () => {
    const db = await getDb();
    await db.put(STORE_MEDIA, makeMedia({ id: 'enc-1', encrypted: true }));

    const backup = await backupRepo.exportBackup('dev-test');
    const entry = backup.media.find((m) => m.id === 'enc-1');
    expect(entry?.encrypted).toBe(true);

    resetIdb();
    await backupRepo.importBackup(backup);
    const db2 = await getDb();
    const restored = await db2.get(STORE_MEDIA, 'enc-1') as MediaEntry;
    expect(restored.encrypted).toBe(true);
  });

  it('מייצא ומייבא הקלטת קול/סמל (STORE_SYMBOLS)', async () => {
    const db = await getDb();
    await db.put(STORE_SYMBOLS, sampleRecording);

    const backup = await backupRepo.exportBackup('dev-test');
    expect(backup.symbols.some((s) => s.id === 'rec-1' && s.source === 'recording')).toBe(true);

    resetIdb();
    await backupRepo.importBackup(backup);
    const db2 = await getDb();
    const restored = await db2.get(STORE_SYMBOLS, 'rec-1') as SymbolEntry;
    expect(restored.mimeType).toBe('audio/webm');
    expect(restored.uri).toBe(sampleRecording.uri);
  });

  it('importBackup מסנן רשומות מדיה/סמל פגומות', async () => {
    const backup = await backupRepo.exportBackup('dev-test');
    resetIdb();
    await backupRepo.importBackup({
      ...backup,
      media: [{ garbage: true }],
      symbols: [{ garbage: true }],
    });
    const db = await getDb();
    expect(await db.getAll(STORE_MEDIA)).toHaveLength(0);
    expect(await db.getAll(STORE_SYMBOLS)).toHaveLength(0);
  });

  it('תאימות-לאחור: גיבוי v1 (ללא media/symbols) עדיין נטען', async () => {
    await backupRepo.importBackup({
      backupFormat: 1,
      exportedAt: 123,
      deviceId: 'legacy',
      boards: [sampleBoard],
      profiles: [],
      settings: {},
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
