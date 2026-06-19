import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { createBoardRepo } from './boardRepo';
import { createProfileRepo } from './profileRepo';
import { createSettingsRepo } from './settingsRepo';
import {
  ensureSeeded,
  createProfile,
  loadActiveContext,
  switchActiveProfile,
  cloneBoard,
} from './bootstrap';
import { SAMPLE_CORE_BOARD } from '../domain/sampleBoard';
import { HOME_BOARD, HOME_BOARD_ID, DEMO_PROFILE_V2 } from '../domain/boardLibrary';
import type { Profile } from '../domain/models';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('boardRepo / profileRepo — שמירה, רשימה, ארכוב', () => {
  it('save+get משמרים לוח', async () => {
    const repo = createBoardRepo();
    await repo.save(SAMPLE_CORE_BOARD);
    expect((await repo.get(SAMPLE_CORE_BOARD.id))?.name).toBe(
      SAMPLE_CORE_BOARD.name,
    );
  });

  it('ארכוב = מחיקה רכה: הרשומה נשמרת אך מוסתרת מרשימת ברירת המחדל', async () => {
    const repo = createProfileRepo();
    const p: Profile = {
      id: 'p1',
      name: 'עומר',
      homeBoardId: 'b1',
      locked: true,
    };
    await repo.save(p);
    await repo.archive('p1');

    expect(await repo.list()).toHaveLength(0); // ברירת מחדל מסננת מאורכבים
    const all = await repo.list({ includeArchived: true });
    expect(all).toHaveLength(1);
    expect(all[0].archived).toBe(true); // הנתון לא אבד — ניתן לשחזור
  });
});

describe('settingsRepo', () => {
  it('שומר ומחזיר פרופיל פעיל וקוד מטפל', async () => {
    const s = createSettingsRepo();
    await s.setActiveProfileId('abc');
    await s.setCaregiverPin('9999');
    expect(await s.getActiveProfileId()).toBe('abc');
    expect(await s.getCaregiverPin()).toBe('9999');
  });
});

describe('bootstrap — seed, יצירת פרופיל, מעבר', () => {
  it('ensureSeeded זורע פרופיל+לוחות ספרייה, פעיל ו-PIN (idempotent)', async () => {
    await ensureSeeded();
    await ensureSeeded(); // לא דורס ולא משכפל

    const profiles = await createProfileRepo().list();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe(DEMO_PROFILE_V2.id);

    const ctx = await loadActiveContext();
    expect(ctx.activeProfile.id).toBe(DEMO_PROFILE_V2.id);
    expect(ctx.board.id).toBe(HOME_BOARD_ID);
    expect(await createSettingsRepo().getCaregiverPin()).toBeTruthy();
  });

  it('ensureSeeded זורע את כל לוחות הספרייה (אוכל/רגשות/משחק)', async () => {
    await ensureSeeded();
    const boards = await createBoardRepo().list();
    // לפחות 4 לוחות: בית + 3 קטגוריות
    expect(boards.length).toBeGreaterThanOrEqual(4);
    expect(boards.find((b) => b.id === HOME_BOARD_ID)).toBeDefined();
  });

  it('createProfile יוצר פרופיל עם לוח-בית עצמאי (קלון, מזהה חדש)', async () => {
    await ensureSeeded();
    const p = await createProfile('דנה');
    expect(p.homeBoardId).not.toBe(HOME_BOARD_ID); // קלון, לא המקור

    const board = await createBoardRepo().get(p.homeBoardId);
    expect(board?.isCoreBoard).toBe(false);
    // עקביות מוטורית נשמרת בקלון: אותם מיקומים בדיוק.
    expect(board?.placements).toEqual(HOME_BOARD.placements);
  });

  it('switchActiveProfile מחליף פרופיל פעיל ולוח בית', async () => {
    await ensureSeeded();
    const p = await createProfile('דנה');
    const ctx = await switchActiveProfile(p.id);
    expect(ctx.activeProfile.id).toBe(p.id);
    expect(ctx.board.id).toBe(p.homeBoardId);
  });

  it('cloneBoard לא משנה את המקור', () => {
    const clone = cloneBoard(SAMPLE_CORE_BOARD, 'X');
    clone.cells['i'].label = 'שונה';
    expect(SAMPLE_CORE_BOARD.cells['i'].label).toBe('אני');
    expect(clone.id).not.toBe(SAMPLE_CORE_BOARD.id);
  });
});
