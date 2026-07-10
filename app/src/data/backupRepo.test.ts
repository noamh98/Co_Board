import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { backupRepo, blobToDataUri, dataUriToBlob } from './backupRepo';
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

describe('exportBackup / importBackup — round-trip', () => {
  it('יצוא וייבוא שומר לוחות ופרופילים', async () => {
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

describe('D-10 (3.8): שלמות ייצוא — מדיה + הקלטות', () => {
  const mediaEntry: MediaEntry = {
    id: 'media-1',
    cellId: 'cell-1',
    profileId: 'p1',
    mimeType: 'image/webp',
    blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/webp' }),
    encrypted: false,
    source: 'camera',
    createdAt: 1000,
  };
  const recordingSymbol: SymbolEntry = {
    id: 'rec-1',
    uri: 'data:audio/webm;base64,AAAA',
    mimeType: 'audio/webm',
    source: 'recording',
    createdAt: 2000,
  };
  const arasaacSymbol: SymbolEntry = {
    id: 'arasaac:123',
    uri: 'data:image/png;base64,BBBB',
    mimeType: 'image/png',
    source: 'arasaac',
    createdAt: 3000,
  };

  // הערת סביבה: fake-indexeddb תחת JSDOM מאבד תוכן Blob (מחזיר Object ריק) — לכן
  // ייצוג הבייטים נבדק דרך ההמרות הישירות; בדפדפן אמיתי ה-Blob חוזר שלם מ-IndexedDB.
  it('blobToDataUri ⇄ dataUriToBlob — זהות בייטים מלאה', async () => {
    const bytes = [1, 2, 3, 250, 0, 128];
    const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/webm' });
    const dataUri = await blobToDataUri(blob, 'audio/webm');
    expect(dataUri.startsWith('data:audio/webm;base64,')).toBe(true);

    const back = dataUriToBlob(dataUri, 'audio/webm');
    expect(back.type).toBe('audio/webm');
    const reader = new FileReader();
    const restored = await new Promise<Uint8Array>((resolve) => {
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(back);
    });
    expect(Array.from(restored)).toEqual(bytes);
  });

  it('ייצוא כולל הקלטות (symbols); ARASAAC לא מיוצא', async () => {
    const db = await getDb();
    await db.put(STORE_SYMBOLS, recordingSymbol);
    await db.put(STORE_SYMBOLS, arasaacSymbol);

    const backup = await backupRepo.exportBackup('dev-test');
    expect(backup.symbols.map((s) => s.id)).toEqual(['rec-1']);
    expect(backup.symbols[0].uri).toBe(recordingSymbol.uri);
  });

  it('מדיה מאורכבת (מחיקה רכה) לא מיוצאת', async () => {
    const db = await getDb();
    await db.put(STORE_MEDIA, { ...mediaEntry, id: 'media-arch', archived: true });

    const backup = await backupRepo.exportBackup('dev-test');
    expect(backup.media.some((m) => m.id === 'media-arch')).toBe(false);
  });

  it('ייבוא גיבוי פורמט 2 משחזר רשומות מדיה והקלטות ל-stores', async () => {
    const mediaRecord = {
      id: 'media-1',
      cellId: 'cell-1',
      profileId: 'p1',
      mimeType: 'image/webp',
      dataUri: await blobToDataUri(mediaEntry.blob, 'image/webp'),
      encrypted: false,
      source: 'camera',
      createdAt: 1000,
    };
    await backupRepo.importBackup({
      backupFormat: 2,
      exportedAt: 123,
      deviceId: 'dev',
      boards: [],
      profiles: [],
      settings: {},
      media: [mediaRecord],
      symbols: [recordingSymbol],
    });

    const db = await getDb();
    const media = (await db.get(STORE_MEDIA, 'media-1')) as MediaEntry;
    expect(media).toBeDefined();
    expect(media.mimeType).toBe('image/webp');
    expect(media.cellId).toBe('cell-1');
    const rec = (await db.get(STORE_SYMBOLS, 'rec-1')) as SymbolEntry;
    expect(rec.uri).toBe(recordingSymbol.uri);
  });

  it('תאימות-לאחור: ייבוא גיבוי פורמט 1 (ללא media/symbols) עובד', async () => {
    await backupRepo.importBackup({
      backupFormat: 1,
      exportedAt: 123,
      deviceId: 'old-dev',
      boards: [sampleBoard],
      profiles: [],
      settings: {},
    });
    const db = await getDb();
    const loaded = (await db.get(STORE_BOARDS, 'b1')) as Board;
    expect(loaded.name).toBe('לוח בדיקה');
  });

  it('רשומת מדיה עם data-URI פגום מסוננת בלי לשבור את הייבוא', async () => {
    const backup = await backupRepo.exportBackup('dev-test');
    await backupRepo.importBackup({
      ...backup,
      boards: [sampleBoard],
      media: [
        { ...mediaEntry, blob: undefined, dataUri: 'data:image/webp;base64' }, // חסר פסיק
        { garbage: true },
      ],
    });
    const db = await getDb();
    expect(((await db.getAll(STORE_MEDIA)) as MediaEntry[])).toHaveLength(0);
    expect(((await db.get(STORE_BOARDS, 'b1')) as Board).name).toBe('לוח בדיקה');
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
