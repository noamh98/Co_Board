import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { createBoardRepo } from './boardRepo';
import { createProfileRepo } from './profileRepo';
import { ensureSeeded, createProfileFromTemplate } from './bootstrap';
import { listBoardLibrary } from '../domain/boardLibrary';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('ensureSeeded', () => {
  it('זורע את כל 11 לוחות הספרייה בהתקנה נקייה', async () => {
    await ensureSeeded();
    const boards = await createBoardRepo().list();
    const libraryIds = new Set(listBoardLibrary().map((b) => b.id));
    const seededIds = new Set(boards.map((b) => b.id));
    for (const id of libraryIds) {
      expect(seededIds.has(id)).toBe(true);
    }
    expect(boards.length).toBeGreaterThanOrEqual(11);
  });
});

describe('createProfileFromTemplate', () => {
  it('יוצר לוח ופרופיל ב-DB', async () => {
    await ensureSeeded();
    const profileId = await createProfileFromTemplate('דנה', 'core4x4');
    expect(typeof profileId).toBe('string');
    expect(profileId.startsWith('profile-')).toBe(true);

    const profile = await createProfileRepo().get(profileId);
    expect(profile).toBeDefined();

    const board = await createBoardRepo().get(profile!.homeBoardId);
    expect(board).toBeDefined();
  });

  it('פרופיל שנוצר מכיל homeBoardId תקין', async () => {
    await ensureSeeded();
    const profileId = await createProfileFromTemplate('עידן', 'pecs6x3');
    const profile = await createProfileRepo().get(profileId);
    expect(profile?.homeBoardId).toBeTruthy();

    const board = await createBoardRepo().get(profile!.homeBoardId);
    expect(board?.grid.cols).toBe(6);
    expect(board?.grid.rows).toBe(3);
  });

  it('תבנית לא ידועה — נפילה ל-blank4x4 (לוח ריק)', async () => {
    await ensureSeeded();
    const profileId = await createProfileFromTemplate('בדיקה', 'no-such-template');
    const profile = await createProfileRepo().get(profileId);
    const board = await createBoardRepo().get(profile!.homeBoardId);
    expect(Object.keys(board!.cells)).toHaveLength(0);
    expect(board!.placements).toHaveLength(0);
  });

  it('לוח שנוצר הוא קלון — לא משנה את תבנית המקור', async () => {
    await ensureSeeded();
    const { listTemplates } = await import('../domain/boardTemplates');
    const tpl = listTemplates().find((t) => t.id === 'feelings3x3')!;
    const originalCellCount = Object.keys(tpl.board.cells).length;

    const profileId = await createProfileFromTemplate('רון', 'feelings3x3');
    const profile = await createProfileRepo().get(profileId);
    const board = await createBoardRepo().get(profile!.homeBoardId);

    // board שנשמר הוא קלון — id שונה
    expect(board!.id).not.toBe(tpl.board.id);
    // תוכן נשמר
    expect(Object.keys(board!.cells)).toHaveLength(originalCellCount);
    // תבנית המקור לא נפגעה
    expect(Object.keys(tpl.board.cells)).toHaveLength(originalCellCount);
  });
});
